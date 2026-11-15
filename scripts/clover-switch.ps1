param(
    [ValidateSet('Toggle','Start','Stop','Run','Status')][string]$Action = 'Toggle',
    [switch]$NoBrowser,
    [switch]$Quiet
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$switchPath = $PSCommandPath
$runtimeDir = Join-Path $projectRoot 'data'
$statePath = Join-Path $runtimeDir '.clover-desktop.json'
$logDir = Join-Path $runtimeDir 'launcher-logs'

function Show-Notice([string]$message) {
    if ($Quiet) { Write-Output $message; return }
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show($message, 'CLover')
}
function Get-Owner {
    if (!(Test-Path -LiteralPath $statePath)) { return $null }
    try {
        $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $owner = Get-Process -Id $saved.pid -ErrorAction Stop
        $info = Get-CimInstance Win32_Process -Filter "ProcessId = $($saved.pid)"
        if ($owner.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started -and
            $info.Name -eq 'powershell.exe' -and
            $info.CommandLine.Contains($switchPath) -and
            $info.CommandLine -match '-Action Run') { return $saved }
    } catch { }
    return $null
}
function Stop-Tree([int]$processId) {
    & "$env:SystemRoot\System32\taskkill.exe" /PID $processId /T /F 2>&1 | Out-Null
    $remaining = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($remaining) { [void]$remaining.WaitForExit(5000) }
    if ($remaining -and !$remaining.HasExited) { throw '프로그램을 종료하지 못했습니다. 다시 시도해 주세요.' }
}

if ($Action -eq 'Status') {
    $owner = Get-Owner
    if ($owner) { $owner | ConvertTo-Json -Compress } else { '{"running":false}' }
    exit
}

if ($Action -eq 'Run') {
    $serverProcess = $null
    try {
        Set-Location -LiteralPath $projectRoot
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        $node = (Get-Command node.exe -ErrorAction Stop).Source
        & $node scripts/build-web.mjs *> (Join-Path $logDir 'build.log')
        if ($LASTEXITCODE -ne 0) { throw '화면 준비에 실패했습니다. launcher-logs/build.log를 확인해 주세요.' }
        $serverProcess = Start-Process -FilePath $node -ArgumentList 'scripts/start-public.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log')
        $ready = $false
        for ($attempt = 0; $attempt -lt 120; $attempt++) {
            if ($serverProcess.HasExited) { throw '클로버 실행이 중단됐습니다. 인터넷 연결과 launcher-logs의 기록을 확인해 주세요.' }
            try {
                $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2
                if ($health.StatusCode -eq 200) { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
        }
        if (!$ready) { throw '클로버 준비 시간이 초과됐습니다. 잠시 후 다시 실행해 주세요.' }
        $origin = & $node --env-file=.env --env-file=.env.public --input-type=module -e 'console.log(process.env.PUBLIC_ORIGIN)'
        if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^https://[a-z0-9-]+\.ngrok-free\.(app|dev)$') { throw '외부 주소 설정을 확인해 주세요.' }
        $connected = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            if ($serverProcess.HasExited) { throw '외부 연결이 중단됐습니다. 실행 기록을 확인해 주세요.' }
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri "$origin/api/health" -Headers @{'ngrok-skip-browser-warning'='true'} -TimeoutSec 4
                $payload = $response.Content | ConvertFrom-Json
                if ($response.StatusCode -eq 200 -and $payload.ok -eq $true) { $connected = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
        }
        if (!$connected) { throw '외부 접속을 확인하지 못해 종료했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.' }
        if (!$NoBrowser) { Start-Process "$origin/app/" }
        $serverProcess.WaitForExit()
        throw '클로버 서버가 종료됐습니다. 다시 사용하려면 아이콘을 눌러 주세요.'
    } catch {
        $failureMessage = $_.Exception.Message
    } finally {
        if ($serverProcess -and !$serverProcess.HasExited) { Stop-Tree $serverProcess.Id }
        $owner = Get-Owner
        if ($owner -and $owner.pid -eq $PID) { Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue }
    }
    if ($failureMessage) { Show-Notice $failureMessage }
    exit
}

$mutex = New-Object System.Threading.Mutex($false, 'Local\CLoverDesktopSwitch')
$locked = $false
try {
    try { $locked = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) { exit }
    $owner = Get-Owner
    if ($owner) {
        if ($Action -eq 'Start') { Show-Notice '클로버가 이미 실행 중입니다.'; exit }
        Stop-Tree $owner.pid
        Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
        Show-Notice '클로버를 껐습니다. AI와 음성 인식, 외부 연결도 함께 종료했습니다.'
        exit
    }
    if ($Action -eq 'Stop') { Show-Notice '클로버가 이미 꺼져 있습니다.'; exit }
    $existing = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($existing) { throw '기존 서버가 실행 중입니다. 기존 실행 창에서 먼저 종료해 주세요.' }
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
    $arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $switchPath + '" -Action Run'
    if ($NoBrowser) { $arguments += ' -NoBrowser' }
    if ($Quiet) { $arguments += ' -Quiet' }
    $worker = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    @{pid=$worker.Id; started=$worker.StartTime.ToUniversalTime().Ticks.ToString(); running=$true} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
} catch {
    Show-Notice $_.Exception.Message
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
