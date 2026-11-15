#Requires -RunAsAdministrator
param([Parameter(Mandatory=$true)][string]$LanIp)
$ErrorActionPreference = 'Stop'
if ($LanIp -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)') { throw '사설 Wi-Fi IP를 입력해 주세요.' }
$cloverAddress = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $LanIp
$cloverProfile = Get-NetConnectionProfile -InterfaceIndex $cloverAddress.InterfaceIndex
if ($cloverProfile.NetworkCategory -ne 'Private') { throw '신뢰하는 개인 Wi-Fi에서 실행해 주세요. 네트워크 유형을 자동으로 변경하지 않습니다.' }
$cloverNode = (Get-Command node -CommandType Application).Source
$cloverRuleName = 'CLover-LAN-3000-' + $LanIp
if (!(Get-NetFirewallRule -Name $cloverRuleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name $cloverRuleName -DisplayName "CLover LAN 3000 ($LanIp)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -LocalAddress $LanIp -RemoteAddress LocalSubnet -InterfaceAlias $cloverAddress.InterfaceAlias -Profile Private -Program $cloverNode
}
Write-Host "같은 Wi-Fi에서 http://${LanIp}:3000/app/ 에 접속하세요."
