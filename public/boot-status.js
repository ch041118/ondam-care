(function () {
  var initial = document.getElementById('boot-message');
  if (initial) initial.textContent = '로그인 화면에 연결하고 있어요.';
  function fail() {
    var message = document.getElementById('boot-message');
    if (message) message.textContent = '연결이 지연되고 있어요. Safari에서 이 사이트의 콘텐츠 차단을 해제하고 다시 열어 주세요. 계속되면 iOS 업데이트와 인터넷 연결을 확인해 주세요.';
  }
  window.addEventListener('error', fail, true);
  window.addEventListener('unhandledrejection', fail);
  setTimeout(fail, 15000);
})();
