export function validateServerUrl(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) {
    throw Error('HTTPS 서버 주소를 입력해 주세요. USB 개발 연결은 http://localhost:3000을 사용할 수 있어요.');
  }
  return url.origin;
}

// Release/cancel while permission or start is pending must never leave a live mic.
export function createHoldRecorder({ recorder, onState, onAudio, onError, maxMs = 60000 }) {
  let phase = 'idle', holding = false, cancelled = false, timer;
  const change = value => { phase = value; onState(value); };
  async function finish() {
    if (phase !== 'recording') return;
    clearTimeout(timer);
    change('stopping');
    try {
      if (cancelled) { await recorder.cancel(); return; }
      const audio = await recorder.stop();
      if (!cancelled) { change('sending'); await onAudio(audio); }
    } catch (error) {
      if (!cancelled) onError(error);
    } finally { holding = false; change('idle'); }
  }
  return {
    get phase() { return phase; },
    async press() {
      if (phase !== 'idle') return;
      holding = true; cancelled = false; change('starting');
      try {
        await recorder.permission();
        if (!holding || cancelled) { change('idle'); return; }
        await recorder.start();
        change('recording');
        if (!holding || cancelled) await finish();
        else timer = setTimeout(() => { holding = false; void finish(); }, maxMs);
      } catch (error) {
        holding = false;
        try { await recorder.cancel(); } catch {}
        change('idle');
        if (!cancelled) onError(error);
      }
    },
    release(cancel = false) {
      holding = false; cancelled ||= cancel;
      return finish();
    }
  };
}
