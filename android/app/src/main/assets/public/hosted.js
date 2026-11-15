(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };

  // public/caregiver-fields.js
  function caregiverFields(c = {}, demo2 = false) {
    const options = (value, end = false) => Array.from({ length: 97 }, (_, i) => i / 4).filter((h) => end ? h > 0 : h < 24).map((h) => `<option value="${h}" ${h === value ? "selected" : ""}>${hourText(h)}</option>`).join("");
    return `${!c.id ? '<label>\uC131\uD568<input name="name" required maxlength="50" autocomplete="name"></label>' : ""}
 ${demo2 ? `<label>\uD76C\uB9DD \uADFC\uBB34 \uC9C0\uC5ED<select name="regionId" aria-label="\uD76C\uB9DD \uADFC\uBB34 \uC9C0\uC5ED"><option value="yeonnam" ${c.regionId === "yeonnam" ? "selected" : ""}>\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C \uC5F0\uB0A8\uB3D9</option><option value="seogyo" ${c.regionId === "seogyo" ? "selected" : ""}>\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C \uC11C\uAD50\uB3D9</option><option value="gangnam" ${c.regionId === "gangnam" ? "selected" : ""}>\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uC5ED\uC0BC\uB3D9</option></select></label><p class="subtitle">\uCCB4\uD5D8 \uC9C0\uC5ED\uC758 \uAC00\uC0C1 \uC704\uCE58\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.</p>` : `<label>\uD76C\uB9DD \uADFC\uBB34 \uC9C0\uC5ED\uC758 \uAE30\uC900 \uC8FC\uC18C<input name="address" required maxlength="200" placeholder="\uC608: \uC11C\uC6B8 \uB9C8\uD3EC\uAD6C \uC131\uBBF8\uC0B0\uB85C 189" value="${esc(c.address || "")}"></label><p class="subtitle">\uC774 \uC8FC\uC18C \uC8FC\uBCC0 5km \uC548\uC5D0\uC11C \uB3CC\uBD04\uC744 \uC5F0\uACB0\uD569\uB2C8\uB2E4. \uB124\uC774\uBC84 \uC8FC\uC18C \uAC80\uC0C9\uC73C\uB85C \uC704\uCE58\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.</p>`}
 <fieldset class="work-days"><legend>\uD76C\uB9DD \uADFC\uBB34 \uC694\uC77C</legend><div class="day-list">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="days" value="${d}" ${(c.days || [1, 2, 3, 4, 5]).includes(d) ? "checked" : ""}>${"\uC77C\uC6D4\uD654\uC218\uBAA9\uAE08\uD1A0"[d]}</label>`).join("")}</div></fieldset>
 <div class="split"><label>\uC2DC\uC791 \uC2DC\uAC04<select name="from" aria-label="\uC2DC\uC791 \uC2DC\uAC04">${options(c.from ?? 9)}</select></label><label>\uC885\uB8CC \uC2DC\uAC04<select name="to" aria-label="\uC885\uB8CC \uC2DC\uAC04">${options(c.to ?? 18, true)}</select></label></div><p class="subtitle">\uD55C\uAD6D \uC2DC\uAC04 \xB7 15\uBD84 \uB2E8\uC704 \xB7 \uC120\uD0DD\uD55C \uC694\uC77C\uB9C8\uB2E4 \uB3D9\uC77C\uD55C \uC2DC\uAC04\uC744 \uC801\uC6A9\uD569\uB2C8\uB2E4.</p>
 ${!c.id ? `<fieldset class="work-days"><legend>\uC81C\uACF5\uD560 \uB3CC\uBD04</legend><div class="day-list">${["\uC0DD\uD65C \uB3C4\uC6C0", "\uBCD1\uC6D0 \uB3D9\uD589", "\uC2DD\uC0AC \uB3C4\uC6C0", "\uC678\uCD9C \uB3D9\uD589"].map((s) => `<label><input type="checkbox" name="services" value="${s}" checked>${s}</label>`).join("")}</div></fieldset>` : ""}`;
  }
  function caregiverValues(form) {
    const f = new FormData(form);
    return { ...Object.fromEntries(f), from: Number(f.get("from")), to: Number(f.get("to")), days: f.getAll("days").map(Number), services: f.getAll("services") };
  }
  var esc, hourText;
  var init_caregiver_fields = __esm({
    "public/caregiver-fields.js"() {
      esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      hourText = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round(h % 1 * 60)).padStart(2, "0")}`;
    }
  });

  // public/auth-ui.js
  async function authenticate({ api: api3, onBack, force = false }) {
    if (!force) {
      try {
        return await api3("auth/me");
      } catch (e) {
        if (e.status !== 401) throw e;
      }
    }
    const capabilities = await api3("auth/config");
    return new Promise((resolve) => {
      let mode = "login", signupRole = "caregiver";
      const draw = () => {
        document.querySelector("#overlay")?.replaceChildren();
        document.getElementById("app").innerHTML = `<main class="device-setup auth-screen"><div class="setup-logo">\u2724</div><div class="eyebrow">CLOVER CARE</div><h1>${mode === "register" ? "\uD568\uAED8 \uB3CC\uBD04\uC744 \uC2DC\uC791\uD574\uC694." : mode === "pair" ? "\uC5B4\uB974\uC2E0 \uAE30\uAE30 \uC5F0\uACB0" : "\uB2E4\uC2DC \uB9CC\uB098 \uBC18\uAC00\uC6CC\uC694."}</h1><p class="subtitle">${mode === "register" ? "\uACC4\uC815\uACFC \uD76C\uB9DD \uADFC\uBB34 \uC870\uAC74\uC744 \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694." : mode === "pair" ? "\uB2F4\uB2F9\uC790\uAC00 \uBC1C\uAE09\uD55C 6\uC790\uB9AC \uCF54\uB4DC\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694." : "\uC544\uC774\uB514 \uB610\uB294 \uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB85C \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694."}</p><div class="actions auth-tabs"><button type="button" class="btn ${mode === "login" ? "primary" : ""}" data-auth-tab="login">\uB85C\uADF8\uC778</button><button type="button" class="btn ${mode === "register" ? "primary" : ""}" data-auth-tab="register">\uD68C\uC6D0\uAC00\uC785</button></div><form id="auth-form">${mode === "pair" ? '<label>\uC5F0\uACB0 \uCF54\uB4DC<input name="code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="one-time-code" placeholder="6\uC790\uB9AC \uC22B\uC790"></label>' : `<label>${mode === "login" ? "\uC544\uC774\uB514 \uB610\uB294 \uC774\uBA54\uC77C" : "\uC774\uBA54\uC77C"}<input name="email" type="${mode === "login" ? "text" : "email"}" required maxlength="254" autocomplete="username" placeholder="name@example.com"></label><label>\uBE44\uBC00\uBC88\uD638<input name="password" type="password" required minlength="${mode === "register" ? 12 : 1}" maxlength="128" autocomplete="${mode === "register" ? "new-password" : "current-password"}" placeholder="${mode === "register" ? "12\uC790 \uC774\uC0C1" : "\uBE44\uBC00\uBC88\uD638"}"></label>`}${mode === "register" ? `<label>\uAC00\uC785 \uC720\uD615<select id="signup-role"><option value="caregiver" ${signupRole === "caregiver" ? "selected" : ""}>\uC694\uC591\uBCF4\uD638\uC0AC</option><option value="social" ${signupRole === "social" ? "selected" : ""}>\uC0AC\uD68C\uBCF5\uC9C0\uC0AC</option><option value="elder" ${signupRole === "elder" ? "selected" : ""}>\uC5B4\uB974\uC2E0 \xB7 \uBCF4\uD638\uC0AC \uB300\uB9AC \uAC00\uC785</option></select></label><label>\uBE44\uBC00\uBC88\uD638 \uD655\uC778<input name="confirmPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label>${signupRole === "caregiver" ? caregiverFields({}, false) : `<label>\uC131\uD568<input name="name" required maxlength="50" autocomplete="name"></label>${signupRole === "elder" ? '<label>\uAC70\uC8FC \uC8FC\uC18C<input name="address" required maxlength="200" autocomplete="street-address"></label><label>\uBCF4\uD638\uC790 \uC5F0\uB77D\uCC98<input name="contact" type="tel" required maxlength="200" autocomplete="tel"></label>' : ""}`}${signupRole === "social" ? '<div class="notice">\uC0AC\uD68C\uBCF5\uC9C0\uC0AC\uB294 \uAD00\uB9AC\uC790 \uC2B9\uC778 \uD6C4 \uB85C\uADF8\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</div>' : ""}${signupRole !== "social" && !capabilities.maps ? '<div class="notice">\uC8FC\uC18C \uD655\uC778 \uC11C\uBE44\uC2A4\uAC00 \uC5F0\uACB0\uB418\uAE30 \uC804\uAE4C\uC9C0 \uAC00\uC785\uACFC \uADFC\uBB34 \uC870\uAC74 \uC800\uC7A5\uC740 \uAC00\uB2A5\uD558\uBA70, \uC790\uB3D9 \uBC30\uC815\uC740 \uC2DC\uC791\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</div>' : ""}` : ""}<p id="auth-message" class="notice" role="status" aria-live="polite" hidden></p><button class="btn primary setup-start" type="submit">${mode === "register" ? "\uD68C\uC6D0\uAC00\uC785 \uC644\uB8CC" : mode === "pair" ? "\uC5B4\uB974\uC2E0 \uAE30\uAE30 \uC5F0\uACB0\uD558\uAE30" : "\uB85C\uADF8\uC778\uD558\uAE30"}</button></form><div class="actions"><button type="button" class="subtle-link" data-auth-tab="pair">\uC5B4\uB974\uC2E0 \uC5F0\uACB0 \uCF54\uB4DC \uC785\uB825</button>${onBack ? '<button type="button" class="subtle-link" id="auth-back">\uC0AC\uC6A9 \uD658\uACBD \uBCC0\uACBD</button>' : ""}</div><p class="setup-hint">\uC5B4\uB974\uC2E0 \uAC00\uC785\uACFC \uCCAB \uB85C\uADF8\uC778\uC740 \uBCF4\uD638\uC0AC\uAC00 \uB3C4\uC640\uC8FC\uC138\uC694. \uC774\uD6C4 \uB9C8\uC774\uD06C \uD654\uBA74\uC73C\uB85C \uBC14\uB85C \uC5F0\uACB0\uB429\uB2C8\uB2E4.</p></main>`;
        const selector = document.getElementById("signup-role");
        if (selector) selector.onchange = () => {
          const saved = new FormData(document.getElementById("auth-form"));
          signupRole = selector.value;
          draw();
          for (const key of ["email", "password", "confirmPassword", "name", "address", "contact"]) {
            const field = document.getElementById("auth-form").elements.namedItem(key);
            if (field && saved.has(key)) field.value = saved.get(key);
          }
        };
        document.querySelectorAll("[data-auth-tab]").forEach((b) => b.onclick = () => {
          mode = b.dataset.authTab;
          draw();
        });
        if (onBack) document.getElementById("auth-back").onclick = () => resolve(null);
        document.getElementById("auth-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = e.currentTarget, button = f.querySelector('[type="submit"]'), message = document.getElementById("auth-message");
          button.disabled = true;
          message.hidden = true;
          try {
            const values = mode === "register" && signupRole === "caregiver" ? caregiverValues(f) : Object.fromEntries(new FormData(f));
            if (mode === "register" && values.password !== values.confirmPassword) throw Error("\uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
            if (mode === "register") values.role = signupRole;
            delete values.confirmPassword;
            const result = await api3("auth/" + (mode === "register" ? "register" : mode === "pair" ? "pair" : "login"), values);
            f.reset();
            if (result.pendingApproval) {
              mode = "login";
              draw();
              const notice = document.getElementById("auth-message");
              notice.textContent = result.message;
              notice.hidden = false;
              return;
            }
            resolve(result);
          } catch (error) {
            message.textContent = error.message || "\uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
            message.hidden = false;
            button.disabled = false;
          }
        };
      };
      draw();
    });
  }
  function accountSettings({ user, connections, drawer: drawer2, api: api3, logout: logout2, toast: toast2 }) {
    drawer2("\uB0B4 \uACC4\uC815", `<p>${esc2(user.name)} \xB7 ${esc2(user.email || "\uC5B4\uB974\uC2E0 \uC5F0\uACB0 \uAE30\uAE30")}</p>${user.role !== "elder" ? '<form id="password-form"><label>\uD604\uC7AC \uBE44\uBC00\uBC88\uD638<input type="password" name="currentPassword" autocomplete="current-password" required maxlength="128"></label><label>\uC0C8 \uBE44\uBC00\uBC88\uD638<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><label>\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778<input type="password" name="confirmPassword" autocomplete="new-password" required minlength="12" maxlength="128"></label><div class="notice">\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC2DC \uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC544\uC6C3\uB429\uB2C8\uB2E4. \uC5F0\uACB0\uB41C \uC5B4\uB974\uC2E0 \uAE30\uAE30\uB294 \uC0C8 \uC5F0\uACB0 \uCF54\uB4DC\uB85C \uB2E4\uC2DC \uC124\uC815\uD574 \uC8FC\uC138\uC694.</div><button class="btn primary" type="submit">\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD</button></form>' : ""}${user.role === "admin" ? '<div class="actions"><button id="social-approvals" class="btn primary">\uC0AC\uD68C\uBCF5\uC9C0\uC0AC \uAC00\uC785 \uC2B9\uC778</button></div>' : ""}${window.CloverNative ? '<div class="actions"><button id="account-app-settings" class="btn">\uC571 \xB7 \uC54C\uB9BC \uC124\uC815</button></div>' : ""}${connections ? `<div class="notice">\uC74C\uC131 \uC694\uCCAD \uC11C\uBE44\uC2A4: ${connections.voice ? "\uC124\uC815\uB428 \xB7 \uC2E4\uC81C \uC5F0\uACB0 \uD655\uC778 \uD544\uC694" : "\uBBF8\uC5F0\uACB0 \xB7 \uC11C\uBC84\uC5D0 \uB85C\uCEEC \uC74C\uC131 \uC778\uC2DD\uACFC AI \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."}<br>\uC548\uBD80 \uC74C\uC131 \uC751\uB2F5: ${connections.checkinVoice ? "\uC124\uC815\uB428" : "\uBBF8\uC5F0\uACB0"}</div>` : ""}${!window.CloverNative ? '<div class="actions"><button id="account-mic-check" class="btn">\uB9C8\uC774\uD06C \uAD8C\uD55C \uD655\uC778</button></div><p class="setup-hint">\uB9C8\uC774\uD06C \uC811\uADFC\uB9CC \uD655\uC778\uD558\uACE0 \uBC14\uB85C \uB055\uB2C8\uB2E4. \uB179\uC74C\uD558\uAC70\uB098 \uC804\uC1A1\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p>' : ""}<div class="actions"><button id="account-logout" class="btn">\uB85C\uADF8\uC544\uC6C3</button></div><p id="account-message" role="status"></p>`);
    const micCheck = document.getElementById("account-mic-check");
    if (micCheck) micCheck.onclick = async () => {
      micCheck.disabled = true;
      const output = document.getElementById("account-message");
      output.textContent = "\uB9C8\uC774\uD06C \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574 \uC8FC\uC138\uC694.";
      try {
        if (!window.isSecureContext) throw Error("HTTPS \uC8FC\uC18C\uB85C \uC811\uC18D\uD574 \uC8FC\uC138\uC694.");
        if (!navigator.mediaDevices?.getUserMedia) throw Error("Chrome \uB610\uB294 Safari\uC5D0\uC11C \uC5F4\uC5B4 \uC8FC\uC138\uC694.");
        const input = await navigator.mediaDevices.getUserMedia({ audio: true });
        input.getTracks().forEach((track) => track.stop());
        output.textContent = "\uB9C8\uC774\uD06C\uC5D0 \uC811\uADFC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." + (connections?.voice ? " \uB9C8\uC774\uD06C\uB97C \uAFB9 \uB20C\uB7EC \uB9D0\uC500\uD574 \uC8FC\uC138\uC694." : " \uC74C\uC131 \uC694\uCCAD\uC744 \uBCF4\uB0B4\uB824\uBA74 \uC11C\uBC84\uC758 \uC74C\uC131 \uC11C\uBE44\uC2A4\uB97C \uC5F0\uACB0\uD574\uC57C \uD569\uB2C8\uB2E4.");
      } catch (e) {
        output.textContent = microphoneError(e);
      } finally {
        micCheck.disabled = false;
      }
    };
    const approvalButton = document.getElementById("social-approvals");
    if (approvalButton) approvalButton.onclick = () => socialApprovals({ drawer: drawer2, api: api3, toast: toast2 }).catch((e) => toast2(e.message));
    const appSettings = document.getElementById("account-app-settings");
    if (appSettings) appSettings.onclick = () => window.CloverNative.openSettings();
    const error = (e) => document.getElementById("account-message").textContent = e.message;
    document.getElementById("account-logout").onclick = () => logout2().catch(error);
    const form = document.getElementById("password-form");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      if (values.password !== values.confirmPassword) return error(Error("\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."));
      const b = form.querySelector("button");
      b.disabled = true;
      try {
        delete values.confirmPassword;
        await api3("auth/password", values);
        toast2("\uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.");
        await logout2(true);
      } catch (e2) {
        error(e2);
        b.disabled = false;
      }
    };
  }
  async function socialApprovals({ drawer: drawer2, api: api3, toast: toast2 }) {
    const { accounts } = await api3("auth/social-approvals");
    const pending2 = accounts.filter((a) => a.status === "pending");
    drawer2("\uC0AC\uD68C\uBCF5\uC9C0\uC0AC \uAC00\uC785 \uC2B9\uC778", "<p>\uC2E0\uCCAD\uC790\uC758 \uC2E0\uC6D0\uC744 \uD655\uC778\uD55C \uD6C4 \uC2B9\uC778\uD574 \uC8FC\uC138\uC694. \uC2B9\uC778\uD55C \uACC4\uC815\uC740 \uC804\uCCB4 \uB3CC\uBD04 \uC815\uBCF4\uB97C \uC870\uD68C\uD558\uACE0 \uC77C\uC815\uC744 \uC870\uC728\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>" + (accounts.length ? accounts.sort((a, b) => (a.status === "approved") - (b.status === "approved")).map((a) => `<article class="panel panel-pad"><h3>${esc2(a.name)}</h3><p>${esc2(a.email)}</p><p>${a.status === "approved" ? "\uC2B9\uC778 \uC644\uB8CC \xB7 " + esc2(new Date(a.approvedAt).toLocaleString("ko-KR")) : "\uC2B9\uC778 \uB300\uAE30"}</p>${a.status === "pending" ? '<button class="btn primary" data-approve-social="' + esc2(a.id) + '">\uAC00\uC785 \uC2B9\uC778</button>' : ""}</article>`).join("") : "<p>\uC0AC\uD68C\uBCF5\uC9C0\uC0AC \uAC00\uC785 \uC2E0\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>") + "<p>\uC2B9\uC778 \uB300\uAE30 " + pending2.length + "\uBA85</p>");
    document.querySelectorAll("[data-approve-social]").forEach((button) => button.onclick = async () => {
      button.disabled = true;
      try {
        await api3("auth/approve-social", { userId: button.dataset.approveSocial });
        toast2("\uAC00\uC785\uC744 \uC2B9\uC778\uD588\uC2B5\uB2C8\uB2E4. \uC774\uC81C \uB85C\uADF8\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        await socialApprovals({ drawer: drawer2, api: api3, toast: toast2 });
      } catch (e) {
        toast2(e.message);
        button.disabled = false;
      }
    });
  }
  function microphoneError(error) {
    if (["NotAllowedError", "SecurityError"].includes(error.name)) return "\uB9C8\uC774\uD06C \uC0AC\uC6A9\uC774 \uCC28\uB2E8\uB418\uC5B4 \uC788\uC5B4\uC694. \uBE0C\uB77C\uC6B0\uC800\uC758 \uC0AC\uC774\uD2B8 \uAD8C\uD55C\uC5D0\uC11C \uB9C8\uC774\uD06C\uB97C \uD5C8\uC6A9\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
    if (error.name === "NotFoundError") return "\uC5F0\uACB0\uB41C \uB9C8\uC774\uD06C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694. \uD734\uB300\uD3F0\uC774\uB098 \uCEF4\uD4E8\uD130\uC758 \uB9C8\uC774\uD06C\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
    if (error.name === "NotReadableError") return "\uB9C8\uC774\uD06C\uB97C \uCF1C\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uB978 \uD1B5\uD654\xB7\uB179\uC74C \uC571\uC744 \uC885\uB8CC\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
    return error.message || "\uB9C8\uC774\uD06C \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
  }
  var esc2;
  var init_auth_ui = __esm({
    "public/auth-ui.js"() {
      init_caregiver_fields();
      esc2 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    }
  });

  // public/wellness-ui.js
  function createWellnessUI({ api: api3, getState, refresh: refresh2, drawer: drawer2, close: close2, speak: speak2, escape: esc4, formatTime: fmt2, isRecording }) {
    const labels2 = { waiting: "\uB2F5\uBCC0 \uAE30\uB2E4\uB9AC\uB294 \uC911", escalated: "\uBB34\uC751\uB2F5 \xB7 \uD655\uC778 \uD544\uC694", delivery_failed: "\uC54C\uB9BC \uC804\uC1A1 \uD655\uC778 \uD544\uC694", responded: "\uC548\uBD80 \uC751\uB2F5 \uC644\uB8CC", review: "\uB2F5\uBCC0 \uD655\uC778 \uD544\uC694", resolved: "\uB2F4\uB2F9\uC790 \uD655\uC778 \uC644\uB8CC", skipped: "\uC624\uB298 \uC571 \uC0AC\uC6A9", cancelled: "\uC54C\uB9BC \uC911\uB2E8" };
    let lastPrompt = "", quietUntil = 0, activityPending = false;
    const attention = (c) => c.attentionAt && !c.resolvedAt;
    const waiting = (c) => !c.respondedAt && !c.resolvedAt && ["waiting", "escalated", "delivery_failed"].includes(c.status);
    const elder2 = (id) => getState().elders.find((e) => e.id === id);
    const day = (t) => new Date(t + 9 * 36e5).toISOString().slice(0, 10);
    const state = () => getState();
    const policy = () => state().wellnessSettings || { enabled: true, hour: 19, minute: 0, maxAttempts: 3 };
    const counts = () => (state().checkins || []).filter(attention).length;
    function current() {
      if (!location.hash.startsWith("#elder/")) return null;
      const elderId = location.hash.split("/")[1], preview = sessionStorage.getItem("clover.wellness.preview");
      return (state().checkins || []).find((c) => c.elderId === elderId && waiting(c) && (!c.simulation || c.id === preview)) || null;
    }
    function panel() {
      const settings3 = policy(), list = [...state().checkins || []].sort((a, b) => Number(Boolean(attention(b))) - Number(Boolean(attention(a))) || b.createdAt - a.createdAt);
      const used = state().elders.filter((e) => e.lastActiveAt && day(e.lastActiveAt) === day(Date.now())).length;
      return `<div class="page-heading"><div><div class="eyebrow">A LITTLE HELLO, EVERY DAY</div><h1>\uC624\uB298\uC758 \uC548\uBD80</h1><p class="subtitle">\uC624\uB298 \uB9CC\uB098\uC9C0 \uBABB\uD55C \uC5B4\uB974\uC2E0\uC5D0\uAC8C, \uB2E4\uC815\uD558\uAC8C \uC548\uBD80\uB97C \uC5EC\uCB64\uC694.</p></div><button class="btn" data-wellness="settings">\uC548\uBD80 \uC54C\uB9BC \uC124\uC815</button></div><div class="metrics"><div class="metric"><div class="metric-top">\uC624\uB298 \uC571\uC744 \uC0AC\uC6A9\uD55C \uC5B4\uB974\uC2E0</div><div class="metric-value">${used}<span>\uBA85</span></div><div class="metric-foot">\uC9C1\uC811 \uC571\uC744 \uC5F4\uAC70\uB098 \uC694\uCCAD\uD55C \uAE30\uB85D</div></div><div class="metric"><div class="metric-top">\uC624\uB298 \uC548\uBD80 \uB2F5\uBCC0</div><div class="metric-value">${list.filter((c) => !c.simulation && c.respondedAt && day(c.respondedAt) === day(Date.now())).length}<span>\uBA85</span></div><div class="metric-foot">\uBBF8\uC751\uB2F5\uACFC \uB2F5\uBCC0 \uB0B4\uC6A9\uC744 \uAD6C\uBD84\uD574\uC694</div></div><div class="metric warn"><div class="metric-top">\uB2F4\uB2F9\uC790 \uD655\uC778 \uD544\uC694</div><div class="metric-value">${counts()}<span>\uAC74</span></div><div class="metric-foot">\uBB34\uC751\uB2F5 \xB7 \uBC1C\uC1A1 \uC2E4\uD328 \xB7 \uB2F5\uBCC0 \uD655\uC778</div></div><div class="metric"><div class="metric-top">\uB9E4\uC77C \uC548\uBD80 \uC2DC\uAC04</div><div class="metric-value">${String(settings3.hour).padStart(2, "0")}:${String(settings3.minute).padStart(2, "0")}</div><div class="metric-foot">${settings3.enabled ? `5\uBD84 \uAC04\uACA9 \xB7 \uCD1D ${settings3.maxAttempts}\uD68C` : "\uC790\uB3D9 \uC548\uBD80 \uD655\uC778 \uAEBC\uC9D0"}</div></div></div><div class="notice">${state().demo ? "\uAE30\uAE30 \uB0B4 \uCCB4\uD5D8 \uBAA8\uB4DC\uC785\uB2C8\uB2E4. \uC544\uB798 \uCCB4\uD5D8\uB9CC \uB3D9\uC791\uD558\uBA70 \uC571\uC744 \uB2EB\uC73C\uBA74 \uC790\uB3D9 \uC54C\uB9BC\uC774 \uBC1C\uC1A1\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uC571\uC744 \uB2EB\uC544\uB3C4 \uC11C\uBC84\uAC00 \uD655\uC778\uD569\uB2C8\uB2E4. \uC2E4\uC81C \uD478\uC2DC\uB294 \uC11C\uBC84\uC640 \uAE30\uAE30\uC758 \uC54C\uB9BC \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."} \uB9C8\uC9C0\uB9C9 \uC54C\uB9BC \uD6C4\uC5D0\uB3C4 5\uBD84 \uB3D9\uC548 \uAE30\uB2E4\uB9B0 \uB4A4 \uB2F4\uB2F9\uC790\uC5D0\uAC8C \uD655\uC778\uC744 \uC694\uCCAD\uD569\uB2C8\uB2E4.</div><div class="actions" style="margin-bottom:20px"><button class="btn primary" data-wellness="demo">\uC548\uBD80 \uD655\uC778 \uD750\uB984 \uCCB4\uD5D8</button>${window.CloverNative ? '<button class="btn" data-wellness="push">\uC774 \uAE30\uAE30 \uD478\uC2DC \uC54C\uB9BC \uC5F0\uACB0</button>' : ""}</div><section class="panel panel-pad"><div class="panel-title"><h2>\uD655\uC778 \uBAA9\uB85D\uACFC \uC548\uBD80 \uAE30\uB85D</h2><span class="muted">${list.length}\uAC74</span></div>${list.length ? list.slice(0, 40).map((c) => `<article class="wellness-row"><div><strong>${esc4(elder2(c.elderId)?.name || "\uC5B4\uB974\uC2E0")} \uC5B4\uB974\uC2E0</strong> <span class="pill ${attention(c) ? "attention" : ""}">${labels2[c.status]}</span>${c.simulation ? ' <span class="pill">\uCCB4\uD5D8</span>' : ""}<p>${esc4(c.reason || c.response || `${c.attempts.length} / ${c.policy.maxAttempts}\uD68C \uC54C\uB9BC`)}<br><small>${esc4(c.day)} \xB7 ${c.nextAt ? `\uB2E4\uC74C \uD655\uC778 ${fmt2(c.nextAt)}` : fmt2(c.respondedAt || c.resolvedAt || c.createdAt)}</small></p></div><button class="btn" data-wellness="detail" data-id="${esc4(c.id)}">\uAE30\uB85D \uD655\uC778</button></article>`).join("") : '<div class="empty">\uC544\uC9C1 \uC548\uBD80 \uD655\uC778 \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694.<br>\uC800\uB141 \uC548\uBD80 \uC2DC\uAC04\uC774 \uB418\uBA74 \uD655\uC778\uC744 \uC2DC\uC791\uD569\uB2C8\uB2E4.</div>'}</section><section class="panel panel-pad" style="margin-top:20px"><h2>\uC54C\uB9BC \uBC1B\uC744 \uAE30\uAE30</h2><p class="subtitle">${window.CloverNative?.pushStatus || "\uC5B4\uB974\uC2E0\uACFC \uC0AC\uD68C\uBCF5\uC9C0\uC0AC \uAE30\uAE30\uC5D0\uC11C \uC54C\uB9BC\uC744 \uD5C8\uC6A9\uD558\uACE0 \uC11C\uBC84\uC5D0 \uC5F0\uACB0\uD574 \uC8FC\uC138\uC694."}</p>${(state().wellnessDevices || []).map((d) => `<p class="subtitle">${d.role === "elder" ? esc4(elder2(d.elderId)?.name || "\uC5B4\uB974\uC2E0") + " \uC5B4\uB974\uC2E0" : d.role === "social" ? "\uC0AC\uD68C\uBCF5\uC9C0\uC0AC" : "\uC694\uC591\uBCF4\uD638\uC0AC"} \xB7 ${d.platform === "ios" ? "iPhone" : "Android"} \xB7 ${d.permission === "granted" ? "\uD478\uC2DC \uB4F1\uB85D\uB428" : "\uC54C\uB9BC \uC5F0\uACB0 \uD655\uC778 \uD544\uC694"}</p>`).join("") || '<p class="subtitle">\uB4F1\uB85D\uB41C \uD478\uC2DC \uAE30\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}${(state().wellnessOutbox || []).filter((j) => j.kind === "staff" && j.status === "failed").length ? '<div class="notice amber">\uB2F4\uB2F9\uC790 \uD478\uC2DC\uAC00 \uC804\uC1A1\uB418\uC9C0 \uC54A\uC740 \uAE30\uB85D\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uC774 \uD654\uBA74\uC758 \uD655\uC778 \uBAA9\uB85D\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4.</div>' : ""}</section>`;
    }
    function settings2() {
      const s = policy();
      drawer2("\uC548\uBD80 \uC54C\uB9BC \uC124\uC815", `<form id="wellness-settings"><label for="wellness-enabled">\uB9E4\uC77C \uC548\uBD80 \uD655\uC778</label><select id="wellness-enabled" name="enabled"><option value="true" ${s.enabled ? "selected" : ""}>\uC0AC\uC6A9</option><option value="false" ${!s.enabled ? "selected" : ""}>\uC7A0\uC2DC \uC911\uB2E8</option></select><label for="wellness-time">\uC774\uB978 \uC800\uB141 \uC2DC\uAC04 \xB7 \uD55C\uAD6D \uC2DC\uAC04</label><input id="wellness-time" name="time" type="time" min="17:00" max="21:59" value="${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}" required><label for="wellness-count">\uCD1D \uC54C\uB9BC \uD69F\uC218</label><select id="wellness-count" name="count">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === s.maxAttempts ? "selected" : ""}>${n}\uD68C</option>`).join("")}</select><div class="notice">5\uBD84 \uAC04\uACA9\uC740 \uACE0\uC815\uC785\uB2C8\uB2E4. \uB9C8\uC9C0\uB9C9 \uC54C\uB9BC \uD6C4 5\uBD84\uC774 \uC9C0\uB098\uB3C4 \uC751\uB2F5\uC774 \uC5C6\uC73C\uBA74 \uC0AC\uD68C\uBCF5\uC9C0\uC0AC\uC5D0\uAC8C \uD655\uC778\uC744 \uC694\uCCAD\uD569\uB2C8\uB2E4. \uBCC0\uACBD \uB0B4\uC6A9\uC740 \uC0C8\uB85C \uC2DC\uC791\uD558\uB294 \uC548\uBD80 \uD655\uC778\uBD80\uD130 \uC801\uC6A9\uB429\uB2C8\uB2E4. \uC911\uB2E8 \uC2DC \uC9C4\uD589 \uC911 \uC7AC\uC54C\uB9BC\uB3C4 \uC911\uB2E8\uD569\uB2C8\uB2E4.</div><button class="btn primary" type="submit">\uC800\uC7A5\uD558\uAE30</button></form>`);
    }
    function detail2(id) {
      const c = (state().checkins || []).find((c2) => c2.id === id);
      if (!c) return;
      drawer2("\uC548\uBD80 \uD655\uC778 \uAE30\uB85D", `<h2>${esc4(elder2(c.elderId)?.name)} \uC5B4\uB974\uC2E0</h2><div class="notice ${attention(c) ? "amber" : ""}">${labels2[c.status]}${c.simulation ? " \xB7 \uCCB4\uD5D8 \uAE30\uB85D" : ""}<br>${esc4(c.reason || c.response || "\uC9E7\uC740 \uC548\uBD80 \uB2F5\uBCC0\uC744 \uAE30\uB2E4\uB9AC\uACE0 \uC788\uC5B4\uC694.")}</div><p class="subtitle">\uC54C\uB9BC ${c.attempts.length} / ${c.policy.maxAttempts}\uD68C \xB7 \uAC04\uACA9 5\uBD84<br>${c.response ? `\uC5B4\uB974\uC2E0 \uB2F5\uBCC0: ${esc4(c.response)}` : ""}</p><div class="actions">${c.simulation && c.status === "waiting" ? `<button class="btn" data-wellness="next" data-id="${esc4(id)}">5\uBD84 \uACBD\uACFC \uCCB4\uD5D8</button>` : ""}${c.simulation && waiting(c) ? `<button class="btn" data-wellness="preview" data-id="${esc4(id)}">\uC5B4\uB974\uC2E0 \uC751\uB2F5 \uD654\uBA74 \uCCB4\uD5D8</button>` : ""}</div>${attention(c) ? `<form id="wellness-resolve" data-id="${esc4(id)}"><label for="wellness-note">\uC9C1\uC811 \uC5F0\uB77D\uD55C \uACB0\uACFC\uC640 \uC870\uCE58</label><textarea id="wellness-note" name="note" required maxlength="1000" placeholder="\uC608: \uC804\uD654\uB85C \uC548\uBD80 \uD655\uC778. \uD734\uB300\uD3F0\uC774 \uBB34\uC74C \uC0C1\uD0DC\uC600\uC74C."></textarea><button class="btn primary" type="submit">\uD655\uC778 \uC644\uB8CC</button></form>` : ""}<ol class="timeline">${c.events.map((e) => `<li><p>${esc4(e.message)}</p><small>${fmt2(e.at)}</small></li>`).join("")}</ol>`);
    }
    async function activity() {
      if (current()?.simulation) return;
      if (activityPending || !location.hash.startsWith("#elder/") || document.visibilityState === "hidden") return;
      if (window.CloverNative && window.CloverNative.config.role !== "elder") return;
      activityPending = true;
      try {
        await api3("wellness/activity", { elderId: location.hash.split("/")[1] });
      } catch {
      } finally {
        activityPending = false;
      }
    }
    function renderElder2() {
      const holder = document.getElementById("wellness-elder");
      if (!holder) return false;
      const c = current();
      if (!c) {
        if (holder.dataset.case) {
          const title2 = document.querySelector(".elder h1");
          if (title2) title2.innerHTML = esc4(elder2(location.hash.split("/")[1])?.name) + " \uC5B4\uB974\uC2E0,<br>\uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?";
          const guide2 = document.getElementById("mic-guide");
          if (guide2) guide2.textContent = "\uC544\uB798 \uB9C8\uC774\uD06C\uB97C \uAFB9 \uB204\uB974\uACE0 \uD3B8\uD558\uAC8C \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.";
        }
        holder.innerHTML = "";
        delete holder.dataset.case;
        return Date.now() < quietUntil;
      }
      const tag = `${c.id}:${c.status}:${c.attempts.length}`;
      if (holder.dataset.case !== c.id) {
        holder.dataset.case = c.id;
        holder.innerHTML = `<button class="wellness-okay" data-wellness="reply" data-id="${esc4(c.id)}">\uB124, \uC798 \uC9C0\uB0B4\uC694</button>`;
      }
      const title = document.querySelector(".elder h1");
      if (title) title.innerHTML = "\uC624\uB298 \uD558\uB8E8\uB294<br>\uC5B4\uB5A0\uC168\uC5B4\uC694?";
      const guide = document.getElementById("mic-guide");
      if (guide) guide.textContent = "\uC798 \uC9C0\uB0B4\uC2DC\uBA74 \uC704 \uBC84\uD2BC\uC744 \uB204\uB974\uAC70\uB098 \uB9C8\uC774\uD06C\uB85C \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.";
      if (lastPrompt !== tag) {
        lastPrompt = tag;
        const text = c.simulation ? "\uC548\uBD80 \uD655\uC778 \uCCB4\uD5D8\uC774\uC5D0\uC694. \uC798 \uC9C0\uB0B4\uC2DC\uBA74 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC8FC\uC138\uC694." : "\uC800\uB141\uC740 \uB4DC\uC168\uC5B4\uC694? \uC624\uB298 \uD558\uB8E8\uB294 \uC5B4\uB5A0\uC168\uB098\uC694? \uD3B8\uD558\uAC8C \uC548\uBD80\uB97C \uB4E4\uB824\uC8FC\uC138\uC694.";
        document.getElementById("voice-result").textContent = "\uD3B8\uD558\uAC8C \uC548\uBD80\uB97C \uB4E4\uB824\uC8FC\uC138\uC694.";
        speak2(text);
      }
      return true;
    }
    async function received(result) {
      if (!result?.checkin) return false;
      quietUntil = Date.now() + 6e4;
      await window.CloverNative?.clearCheckinNotifications?.(result.checkin.id);
      renderElder2();
      return true;
    }
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-wellness]");
      if (!button) return;
      const action = button.dataset.wellness, id = button.dataset.id;
      try {
        if (action === "settings") return settings2();
        if (action === "detail") return detail2(id);
        if (action === "preview") {
          const c = state().checkins.find((c2) => c2.id === id);
          sessionStorage.setItem("clover.wellness.preview", id);
          close2();
          location.hash = `elder/${c.elderId}`;
          return;
        }
        if (action === "demo") {
          drawer2("\uC548\uBD80 \uD655\uC778 \uCCB4\uD5D8", `<form id="wellness-demo"><label for="wellness-demo-elder">\uC5B4\uB974\uC2E0</label><select id="wellness-demo-elder" name="elderId">${state().elders.map((e) => `<option value="${e.id}">${esc4(e.name)}</option>`).join("")}</select><div class="notice">\uC2E4\uC81C \uD478\uC2DC\uB294 \uBCF4\uB0B4\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uBC84\uD2BC\uC73C\uB85C 5\uBD84\uC529 \uC9C4\uD589\uD558\uBA70 \uBBF8\uC751\uB2F5\uACFC \uB2F5\uBCC0 \uCC98\uB9AC\uB97C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.</div><button class="btn primary" type="submit">\uCCAB \uC548\uBD80 \uC54C\uB9BC \uCCB4\uD5D8</button></form>`);
          return;
        }
        button.disabled = true;
        if (action === "push") {
          await window.CloverNative?.enablePush?.();
          await refresh2();
          return;
        }
        if (action === "next") {
          await api3("wellness/demo", { id });
          await refresh2();
          detail2(id);
        }
        if (action === "reply") {
          if (isRecording?.() || window.CloverNative?.busy) {
            button.disabled = false;
            return;
          }
          const c = state().checkins.find((c2) => c2.id === id);
          const result = await api3("wellness/reply", { id, elderId: c.elderId, outcome: "okay", text: "\uB124, \uC798 \uC9C0\uB0B4\uC694" });
          await refresh2();
          await received({ checkin: result });
          const text = "\uB2F5\uD574 \uC8FC\uC154\uC11C \uACE0\uB9C8\uC6CC\uC694.\n\uD3B8\uC548\uD55C \uC800\uB141 \uBCF4\uB0B4\uC138\uC694.";
          document.getElementById("voice-result").textContent = text;
          speak2(text);
        }
      } catch (error) {
        if (location.hash.startsWith("#elder/")) {
          document.getElementById("voice-result").textContent = "\uB2F5\uBCC0\uC744 \uBCF4\uB0B4\uC9C0 \uBABB\uD588\uC5B4\uC694.\n\uC5F0\uACB0\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uB20C\uB7EC \uC8FC\uC138\uC694.";
        } else alert(error.message);
        button.disabled = false;
      }
    });
    document.addEventListener("submit", async (event) => {
      const form = event.target;
      if (!["wellness-settings", "wellness-demo", "wellness-resolve"].includes(form.id)) return;
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form)), button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        let result;
        if (form.id === "wellness-settings") {
          const [hour, minute] = body.time.split(":").map(Number);
          await api3("wellness/settings", { enabled: body.enabled === "true", hour, minute, maxAttempts: Number(body.count) });
        }
        if (form.id === "wellness-demo") result = await api3("wellness/demo", body);
        if (form.id === "wellness-resolve") result = await api3("wellness/resolve", { id: form.dataset.id, note: body.note });
        await refresh2();
        close2();
        if (result) detail2(result.id);
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
    for (const eventName of ["pointerdown", "keydown"]) document.addEventListener(eventName, (event) => {
      if (event.target.closest(".elder")) void activity();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void activity();
    });
    window.addEventListener("clover-foreground", () => {
      void activity();
    });
    return { panel, counts, current, renderElder: renderElder2, activity, received };
  }
  var init_wellness_ui = __esm({
    "public/wellness-ui.js"() {
    }
  });

  // public/app.js
  var app_exports = {};
  async function api(path, body) {
    if (window.CloverNative) return window.CloverNative.api(path, body);
    const controller2 = new AbortController(), timer = setTimeout(() => controller2.abort(), 2e4);
    try {
      const headers = { "ngrok-skip-browser-warning": "1" };
      if (body) headers["Content-Type"] = "application/json";
      const res = await fetch("/api/" + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : void 0, signal: controller2.signal });
      if (!res.headers.get("content-type")?.includes("application/json")) throw Error("\uC811\uC18D \uC548\uB0B4\uB97C \uD655\uC778\uD574\uC57C \uD569\uB2C8\uB2E4. Safari\uC5D0\uC11C \uC571 \uC8FC\uC18C\uB97C \uB2E4\uC2DC \uC5F4\uACE0 Visit Site\uB97C \uB20C\uB7EC \uC8FC\uC138\uC694.");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 && !path.startsWith("auth/")) location.reload();
        throw Object.assign(Error(data.error), { status: res.status });
      }
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw Error("\uC11C\uBC84 \uC5F0\uACB0\uC774 \uC9C0\uC5F0\uB418\uACE0 \uC788\uC5B4\uC694. \uC778\uD130\uB137 \uC5F0\uACB0\uC744 \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 5e3);
  }
  async function refresh() {
    db = await api("state");
    if (db.auth) {
      role = db.auth.user.role;
      selectedCaregiver = db.auth.user.caregiverId;
    }
    render();
    wellnessUI?.renderElder();
  }
  function navItem(id, name, type, count = "") {
    return `<a href="#${id}" class="navitem ${page === id ? "active" : ""}">${icon(type)}${name}${count ? `<span class="count">${count}</span>` : ""}</a>`;
  }
  function shell(content) {
    const count = db.requests.filter((r) => r.status === "attention").length;
    return `<aside class="sidebar">${brand}<div class="brand-caption">\uC77C\uC0C1\uC744 \uC787\uB294 \uB530\uB73B\uD55C \uB3CC\uBD04</div><div class="navlabel">WORKSPACE</div><nav>${navItem("overview", "\uB3CC\uBD04 \uD55C\uB208\uC5D0", "grid")}${navItem("requests", "\uC694\uCCAD \xB7 \uC77C\uC815", "calendar", count)}${navItem("caregivers", role === "caregiver" ? "\uB0B4 \uADFC\uBB34 \uC124\uC815" : "\uC694\uC591\uBCF4\uD638\uC0AC", "people")}${navItem("elders", "\uC5B4\uB974\uC2E0 \uAD00\uB9AC", "heart")}${navItem("history", "\uCC98\uB9AC \uB0B4\uC5ED", "clock")}${!db.auth || ["social", "admin"].includes(role) ? navItem("wellness", "\uC624\uB298\uC758 \uC548\uBD80", "heart", wellnessUI?.counts()) : ""}</nav><div class="sidebar-bottom"><button class="role-switch" data-do="role">${icon("people")} ${["social", "admin"].includes(role) ? "\uC694\uC591\uBCF4\uD638\uC0AC" : "\uC0AC\uD68C\uBCF5\uC9C0\uC0AC"} \uD654\uBA74\uC73C\uB85C \uC804\uD658</button><div class="profile"><span class="avatar">${["social", "admin"].includes(role) ? "\uBCF5\uC9C0" : "\uB3CC\uBD04"}</span><div><strong>${["social", "admin"].includes(role) ? role === "admin" ? "\uAD00\uB9AC\uC790" : "\uC0AC\uD68C\uBCF5\uC9C0\uC0AC" : esc3(carer(selectedCaregiver)?.name) + " \uC694\uC591\uBCF4\uD638\uC0AC"}</strong><br><small>${db.auth ? "\uB0B4 \uACC4\uC815" : "\uC5F0\uB0A8 \uB3CC\uBD04\uC13C\uD130 \xB7 \uC2DC\uC5F0"}</small></div><button data-do="settings" aria-label="\uC5F0\uACB0 \uC124\uC815">${icon("settings")}</button></div></div></aside><main class="main"><header class="topbar"><span class="crumb">${db.auth ? "\uD074\uB85C\uBC84 \uB3CC\uBD04" : "\uC5F0\uB0A8 \uB3CC\uBD04\uC13C\uD130"} <span style="margin:0 10px;color:#bec6b7">/</span><strong>${["social", "admin"].includes(role) ? role === "admin" ? "\uAD00\uB9AC\uC790 \uACF5\uAC04" : "\uC0AC\uD68C\uBCF5\uC9C0\uC0AC \uACF5\uAC04" : "\uC694\uC591\uBCF4\uD638\uC0AC \uACF5\uAC04"}</strong></span><span class="mobile-brand">clover.</span><div class="topbar-right"><span class="live"><span class="dot"></span>${db.auth ? "\uB85C\uADF8\uC778\uB428" : window.CloverNative?.modeLabel || "\uAC00\uC0C1 \uB370\uC774\uD130 \uC2DC\uC5F0"}</span><button data-do="role" class="subtle-link">${["social", "admin"].includes(role) ? "\uBCF4\uD638\uC0AC\uB85C \uC804\uD658" : "\uBCF5\uC9C0\uC0AC\uB85C \uC804\uD658"}</button><button data-do="settings" aria-label="\uC5F0\uACB0 \uC124\uC815">${icon("settings")}</button></div></header>${content}<footer class="footer"><span>\uC791\uC740 \uBD80\uD0C1\uBD80\uD130, \uB4E0\uB4E0\uD55C \uC77C\uC0C1\uAE4C\uC9C0. \uD074\uB85C\uBC84\uAC00 \uD568\uAED8\uD569\uB2C8\uB2E4.</span><span>CLover \xB7 Prototype 0.3</span></footer></main>`;
  }
  function heading(title, sub, button = "") {
    return `<div class="page-heading"><div><div class="eyebrow">CARE, CONNECTED</div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${button}</div>`;
  }
  function overview() {
    const attention = db.requests.filter((r) => r.status === "attention"), pending2 = db.requests.filter((r) => r.status === "pending"), confirmed = db.requests.filter((r) => r.status === "confirmed"), completed = db.requests.filter((r) => r.status === "completed");
    return heading("\uC624\uB298\uB3C4, \uC548\uC2EC\uB418\uB294 \uB3CC\uBD04", "\uC77C\uC0C1\uC801\uC778 \uC5F0\uACB0\uC740 \uD074\uB85C\uBC84\uC5D0\uAC8C. \uAF2D \uD544\uC694\uD55C \uC21C\uAC04\uC5D0\uB9CC \uD568\uAED8\uD574 \uC8FC\uC138\uC694.", `<button class="btn primary" data-do="demo">${icon("plus")} \uC694\uCCAD \uC2DC\uC5F0\uD558\uAE30</button>`) + `${wellnessUI?.counts() ? `<a href="#wellness" class="notice amber" style="display:block">\uC548\uBD80 \uD655\uC778\uC774 \uD544\uC694\uD55C \uC694\uCCAD ${wellnessUI.counts()}\uAC74\uC774 \uC788\uC5B4\uC694. \uD655\uC778\uD558\uB7EC \uAC00\uAE30 \u2192</a>` : ""}<div class="metrics">${[["\uC811\uC218\uB41C \uB3CC\uBD04", db.requests.length, "\uAC74", "\uC804\uCCB4 \uC694\uCCAD \uD604\uD669", "calendar", ""], ["\uC77C\uC815 \uD655\uC815", confirmed.length, "\uAC74", "\uBCF4\uD638\uC0AC\uAC00 \uC218\uB77D\uD55C \uC77C\uC815", "check", ""], ["\uC218\uB77D \uB300\uAE30", pending2.length, "\uAC74", "\uBCF4\uD638\uC0AC\uC758 \uC751\uB2F5\uC744 \uAE30\uB2E4\uB824\uC694", "clock", ""], ["\uC870\uC728\uC774 \uD544\uC694\uD55C \uC694\uCCAD", attention.length, "\uAC74", "\uB2F4\uB2F9\uC790\uC758 \uD655\uC778\uC774 \uD544\uC694\uD574\uC694", "heart", "warn"]].map(([title, n, unit, note, ic, cls]) => `<div class="metric ${cls}"><div class="metric-top">${title}${icon(ic)}</div><div class="metric-value">${n}<span>${unit}</span></div><div class="metric-foot">${note}</div></div>`).join("")}</div><div class="grid-two"><section class="panel panel-pad"><div class="panel-title"><h2>\uC190\uAE38\uC774 \uD544\uC694\uD55C \uC694\uCCAD <span class="pill attention">${attention.length}</span></h2><a class="subtle-link" href="#requests">\uC804\uCCB4 \uBCF4\uAE30 \u2197</a></div>${attention.length ? attention.slice(0, 2).map((r) => `<article class="attention-card"><div class="attention-top"><span class="avatar">${esc3(elder(r.elderId).name.slice(1))}</span><strong>${esc3(elder(r.elderId).name)} \uC5B4\uB974\uC2E0</strong><span class="pill attention">${esc3(r.service)}</span><time>${shortDate(r.createdAt)} \uC811\uC218</time></div><div class="reason">${esc3(r.reason)}</div><div class="attention-bottom"><span>${esc3(carer(r.caregiverId)?.name || "\uBC30\uC815 \uC804")} \xB7 ${fmt(r.start)}</span><button class="btn" data-open="${r.id}">\uC77C\uC815 \uC870\uC728 ${icon("arrow")}</button></div></article>`).join("") : `<div class="empty">${icon("check")}<br>\uC9C0\uAE08\uC740 \uC870\uC728\uD560 \uC694\uCCAD\uC774 \uC5C6\uC5B4\uC694.<br>\uC0C8\uB85C\uC6B4 \uC694\uCCAD\uC774 \uC0DD\uAE30\uBA74 \uC774\uACF3\uC5D0 \uBAA8\uC544 \uB4DC\uB9B4\uAC8C\uC694.</div>`}</section><section class="panel panel-pad auto-panel"><div class="eyebrow">LESS WORK, MORE CARE</div><h2>\uC5F0\uACB0\uC740 \uC790\uC5F0\uC2A4\uB7FD\uAC8C,<br>\uB3CC\uBD04\uC740 \uBE48\uD2C8\uC5C6\uC774.</h2><p>\uC5B4\uB974\uC2E0\uC758 \uD55C\uB9C8\uB514\uAC00 \uD544\uC694\uD55C \uB3CC\uBD04\uC73C\uB85C \uC774\uC5B4\uC9C0\uB3C4\uB85D.</p><div class="flow-step"><span>1</span>\uB9C8\uC774\uD06C\uB97C \uAFB9 \uB204\uB974\uACE0 \uBD80\uD0C1\uD558\uAE30</div><div class="flow-step"><span>2</span>\uAC00\uAE4C\uC6B4 \uBCF4\uD638\uC0AC\uC758 \uBE48 \uC77C\uC815\uC5D0 \uC2E0\uCCAD</div><div class="flow-step"><span>3</span>\uC5B4\uB824\uC6C0\uC774 \uC0DD\uAE30\uBA74 \uB2F4\uB2F9\uC790\uAC00 \uC870\uC728</div><div class="auto-note">\uBCF4\uD638\uC0AC \uC218\uB77D \uD6C4 \uC77C\uC815 \uD655\uC815 \xB7 \uCC98\uB9AC \uC774\uB825 \uC790\uB3D9 \uAE30\uB85D</div></section></div>${table(db.requests.slice(0, 6), "\uCD5C\uADFC \uB3CC\uBD04 \uC694\uCCAD")}<div class="notice">${completed.length}\uAC74\uC758 \uB3CC\uBD04\uC744 \uB9C8\uCCE4\uC5B4\uC694. \uAC01 \uC694\uCCAD\uC744 \uB204\uB974\uBA74 \uC2E0\uCCAD\uBD80\uD130 \uC644\uB8CC\uAE4C\uC9C0\uC758 \uAE30\uB85D\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</div>`;
  }
  function table(rows, title) {
    return `<section class="panel table-panel"><div class="panel-title"><h2>${title}</h2><span class="subtle-link">${rows.length}\uAC74</span></div><div class="table-wrap"><table><thead><tr><th>\uC5B4\uB974\uC2E0</th><th>\uB3CC\uBD04 \uB0B4\uC6A9</th><th>\uC608\uC815 \uC77C\uC2DC</th><th>\uB2F4\uB2F9 \uBCF4\uD638\uC0AC</th><th>\uC9C4\uD589 \uC0C1\uD0DC</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr tabindex="0" data-open="${r.id}" aria-label="${esc3(elder(r.elderId).name)} ${esc3(r.service)} \uC0C1\uC138"><td><div class="person"><span class="avatar">${esc3(elder(r.elderId).name.slice(1))}</span><strong>${esc3(elder(r.elderId).name)}</strong></div></td><td>${esc3(r.service)}</td><td>${fmt(r.start)}</td><td>${esc3(carer(r.caregiverId)?.name || "\uC870\uC728 \uC911")}</td><td>${badge(r)}</td><td>\u2197</td></tr>`).join("")}</tbody></table></div>${!rows.length ? '<div class="empty">\uD45C\uC2DC\uD560 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>' : ""}<div class="table-footer"><span>\uC694\uCCAD\uC744 \uC120\uD0DD\uD574 \uC0C1\uC138 \uB0B4\uC6A9\uACFC \uCC98\uB9AC \uAE30\uB85D\uC744 \uD655\uC778\uD558\uC138\uC694.</span><span>Asia/Seoul</span></div></section>`;
  }
  function requests(history2 = false) {
    let rows = db.requests;
    if (role === "caregiver") rows = rows.filter((r) => r.caregiverId === selectedCaregiver);
    if (history2) rows = rows.filter((r) => r.status === "completed");
    return heading(history2 ? "\uB3CC\uBD04\uC758 \uBC1C\uC790\uCDE8" : "\uC694\uCCAD\uACFC \uC77C\uC815", history2 ? "\uC5B4\uB5A4 \uB3C4\uC6C0\uC744 \uB4DC\uB838\uB294\uC9C0, \uBAA8\uB4E0 \uACFC\uC815\uC744 \uD55C\uACF3\uC5D0\uC11C \uD655\uC778\uD558\uC138\uC694." : "\uC790\uB3D9 \uC2E0\uCCAD\uB41C \uC77C\uC815\uC744 \uD655\uC778\uD558\uACE0, \uD544\uC694\uD55C \uB2E4\uC74C \uB2E8\uACC4\uB97C \uC9C4\uD589\uD558\uC138\uC694.", `<button class="btn primary" data-do="demo">${icon("plus")} \uC694\uCCAD \uC2DC\uC5F0</button>`) + (role === "caregiver" && !db.auth ? `<div class="notice">\uC2DC\uC5F0\uD560 \uBCF4\uD638\uC0AC <select id="caregiver-select">${db.caregivers.map((c) => `<option value="${c.id}" ${c.id === selectedCaregiver ? "selected" : ""}>${esc3(c.name)}</option>`).join("")}</select></div>` : "") + `<div class="filter-bar" style="padding-left:0"><input id="search" placeholder="\uC5B4\uB974\uC2E0 \uC774\uB984\uC73C\uB85C \uAC80\uC0C9" aria-label="\uC5B4\uB974\uC2E0 \uC774\uB984 \uAC80\uC0C9"><select id="filter" style="width:160px" aria-label="\uC9C4\uD589 \uC0C1\uD0DC"><option value="">\uBAA8\uB4E0 \uC0C1\uD0DC</option>${Object.entries(labels).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div><div id="request-table">${table(rows, history2 ? "\uC644\uB8CC\uB41C \uB3CC\uBD04" : "\uB3CC\uBD04 \uC77C\uC815")}</div>`;
  }
  function caregivers() {
    const list = role === "caregiver" ? db.caregivers.filter((c) => c.id === selectedCaregiver) : db.caregivers;
    return heading(role === "caregiver" ? "\uB0B4 \uADFC\uBB34 \uC124\uC815" : "\uD568\uAED8\uD558\uB294 \uC694\uC591\uBCF4\uD638\uC0AC", "\uD76C\uB9DD \uC9C0\uC5ED\uACFC \uC694\uC77C\xB7\uC2DC\uAC04\uC5D0 \uB9DE\uB294 \uB3CC\uBD04\uC744 \uC5F0\uACB0\uD569\uB2C8\uB2E4.", db.auth ? "" : `<button class="btn primary" data-do="caregiver-signup">\uCCB4\uD5D8 \uBCF4\uD638\uC0AC \uCD94\uAC00</button>`) + `<div class="staff-grid">${list.map((c) => `<article class="staff-card"><span class="avatar">${esc3(c.initials)}</span><h3>${esc3(c.name)} \uC694\uC591\uBCF4\uD638\uC0AC</h3><p>${esc3(c.address || "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C \xB7 \uAE30\uC874 \uC2DC\uC5F0 \uC704\uCE58")}${c.locationVerified === false ? "<br><strong>\uC8FC\uC18C \uD655\uC778 \uB300\uAE30 \xB7 \uC790\uB3D9 \uBC30\uC815 \uC911\uC9C0</strong>" : ""}<br>${c.days.map((d) => "\uC77C\uC6D4\uD654\uC218\uBAA9\uAE08\uD1A0"[d]).join(" \xB7 ")} / ${hourText(c.from)}\u2013${hourText(c.to)}</p><div class="tag-row">${c.services.map((s) => `<span class="pill">${esc3(s)}</span>`).join("")}</div><button class="btn primary" data-availability="${c.id}">\uC9C0\uC5ED \xB7 \uADFC\uBB34 \uC2DC\uAC04 \uC218\uC815</button></article>`).join("")}</div><div class="notice">\uC9C0\uC5ED\uACFC \uC2DC\uAC04 \uBCC0\uACBD\uC740 \uC0C8\uB85C\uC6B4 \uBC30\uC815\uC5D0 \uC801\uC6A9\uB429\uB2C8\uB2E4. \uAE30\uC874 \uC218\uB77D \uB300\uAE30\xB7\uD655\uC815 \uC77C\uC815\uC740 \uC720\uC9C0\uB418\uBA70, \uC218\uD589\uC774 \uC5B4\uB824\uC6B0\uBA74 \uD574\uB2F9 \uC77C\uC815\uC5D0\uC11C \uC0AC\uC720\uB97C \uB0A8\uACA8 \uC8FC\uC138\uC694.</div>`;
  }
  function elders() {
    return heading("\uC5B4\uB974\uC2E0 \uAD00\uB9AC", "\uAC00\uC785\uACFC \uAE30\uAE30 \uC5F0\uACB0\uC740 \uB2F4\uB2F9 \uBCF4\uD638\uC0AC\uAC00 \uB3C4\uC640\uB4DC\uB9BD\uB2C8\uB2E4.", `<button class="btn primary" data-do="register">${icon("plus")} \uC5B4\uB974\uC2E0 \uB4F1\uB85D</button>`) + `<div class="staff-grid">${db.elders.map((e) => `<article class="staff-card"><span class="avatar">${esc3(e.name.slice(1))}</span><h3>${esc3(e.name)} \uC5B4\uB974\uC2E0</h3><p>${esc3(e.address)}<br>\uBCF4\uD638\uC790 \uC5F0\uB77D\uCC98 ${esc3(e.contact)}</p><a class="btn primary" href="#elder/${e.id}">${icon("mic")} \uC5B4\uB974\uC2E0 \uD654\uBA74 \uC5F4\uAE30</a>${db.auth && (["social", "admin"].includes(role) || e.ownerCaregiverId === selectedCaregiver) ? `<button class="btn" data-do="pair-code" data-id="${e.id}">\uAE30\uAE30 \uC5F0\uACB0 \uCF54\uB4DC \uBC1C\uAE09</button>` : ""}</article>`).join("")}</div><div class="notice">\uC5B4\uB974\uC2E0 \uD654\uBA74\uC5D0\uB294 \uBA54\uB274\uB098 \uD68C\uC6D0\uAC00\uC785\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC774 \uAD00\uB9AC \uD654\uBA74\uC5D0\uC11C \uC5B4\uB974\uC2E0\uC744 \uB4F1\uB85D\uD55C \uB4A4, \uD574\uB2F9 \uC5B4\uB974\uC2E0\uC758 \uB9C8\uC774\uD06C \uD654\uBA74\uC744 \uC5F4\uC5B4 \uB4DC\uB9AC\uC138\uC694.</div>`;
  }
  function render() {
    if (!db) return;
    if (db.auth?.user.role === "elder") {
      const hash = "#elder/" + db.auth.user.elderId;
      if (location.hash !== hash) location.hash = hash;
      return renderElder();
    }
    if (location.hash.startsWith("#elder/")) return renderElder();
    elderRendered = false;
    page = location.hash.slice(1) || "overview";
    if (!["overview", "requests", "caregivers", "elders", "history", "wellness"].includes(page)) page = "overview";
    if (db.auth && !["social", "admin"].includes(role) && page === "wellness") page = "requests";
    $("#app").innerHTML = shell(page === "wellness" ? wellnessUI.panel() : page === "overview" ? overview() : page === "requests" ? requests() : page === "history" ? requests(true) : page === "caregivers" ? caregivers() : elders());
    if (db.auth) document.querySelectorAll('[data-do="role"],[data-do="demo"]').forEach((el) => el.remove());
    else if (window.CloverNative) {
      const button = document.createElement("button");
      button.className = "btn";
      button.dataset.do = "account-login";
      button.textContent = "\uC2E4\uC81C \uACC4\uC815 \uB85C\uADF8\uC778";
      document.querySelector(".topbar-right")?.append(button);
    }
  }
  function drawer(title, content) {
    $("#overlay").innerHTML = `<div class="drawer-shade"><section class="drawer" role="dialog" aria-modal="true" aria-label="${title}"><div class="drawer-head"><h2>${title}</h2><button data-do="close" aria-label="\uB2EB\uAE30">${icon("close")}</button></div>${content}</section></div>`;
    $(".drawer").querySelectorAll("label").forEach((label, index) => {
      const field = label.nextElementSibling;
      if (field?.matches("input,select,textarea")) {
        field.id ||= "field-" + index;
        label.htmlFor = field.id;
      }
    });
    $('.drawer [data-do="close"]').focus();
  }
  function close() {
    $("#overlay").innerHTML = "";
  }
  function detail(id) {
    const r = db.requests.find((r2) => r2.id === id);
    let actions = "";
    if (role === "caregiver" && r.caregiverId === selectedCaregiver) {
      if (r.status === "pending") actions += `<button class="btn primary" data-action="accept" data-id="${id}">\uC77C\uC815 \uC218\uB77D\uD558\uAE30</button>`;
      if (["pending", "confirmed"].includes(r.status)) actions += `<button class="btn danger" data-reject="${id}">\uC218\uD589 \uBD88\uAC00</button>`;
      if (r.status === "confirmed") actions += `<button class="btn primary" data-action="complete" data-id="${id}">\uB3CC\uBD04 \uC644\uB8CC</button>`;
    }
    if (["social", "admin"].includes(role) && r.status === "attention") actions = `<button class="btn primary" data-resolve="${id}">\uC77C\uC815 \uC9C1\uC811 \uC870\uC728\uD558\uAE30 ${icon("arrow")}</button>`;
    drawer("\uB3CC\uBD04 \uC694\uCCAD \uC0C1\uC138", `${badge(r)}<div class="panel"><h2>${esc3(elder(r.elderId).name)} \uC5B4\uB974\uC2E0 \xB7 ${esc3(r.service)}</h2><div class="detail-row"><span>\uC5B4\uB974\uC2E0 \uB9D0\uC500</span><span>${esc3(r.transcript)}</span></div><div class="detail-row"><span>\uD76C\uB9DD \uC2DC\uAC04</span><span>${r.requestedAt ? fmt(r.requestedAt) : "\uCD5C\uB300\uD55C \uBE60\uB974\uAC8C"}</span></div><div class="detail-row"><span>\uBC30\uC815 \uC2DC\uAC04</span><span>${fmt(r.start)}<br>${r.duration}\uBD84 \uB3CC\uBD04</span></div><div class="detail-row"><span>\uB2F4\uB2F9 \uBCF4\uD638\uC0AC</span><span>${esc3(carer(r.caregiverId)?.name || "\uC870\uC728 \uC911")}</span></div></div>${r.reason ? `<div class="notice amber">${esc3(r.reason)}</div>` : ""}<div class="actions">${actions}</div>${!actions && ["social", "admin"].includes(role) && r.status !== "completed" ? '<div class="notice">\uBCF4\uD638\uC0AC \uD654\uBA74\uC5D0\uC11C \uC218\uB77D\xB7\uC218\uD589 \uBD88\uAC00\uB97C \uCC98\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</div>' : ""}<h3 style="margin-top:30px">\uCC98\uB9AC \uAE30\uB85D</h3><ol class="timeline">${r.events.map((e) => `<li><strong>${esc3(e.actor)}</strong><p>${esc3(e.message)}</p><small>${fmt(e.at)}</small></li>`).join("")}</ol>`);
  }
  function demo() {
    drawer("\uB3CC\uBD04 \uC694\uCCAD \uC2DC\uC5F0", `<p class="subtitle">\uB9C8\uC774\uD06C \uC5F0\uACB0 \uC804, \uAC00\uC0C1 \uC694\uCCAD\uC73C\uB85C \uC790\uB3D9 \uBC30\uC815 \uD750\uB984\uC744 \uD655\uC778\uD558\uC138\uC694.</p><form id="demo-form"><label>\uC5B4\uB974\uC2E0</label><select name="elderId">${db.elders.map((e) => `<option value="${e.id}">${esc3(e.name)}</option>`).join("")}</select><label>\uB3CC\uBD04 \uB0B4\uC6A9</label><select name="service">${["\uC0DD\uD65C \uB3C4\uC6C0", "\uBCD1\uC6D0 \uB3D9\uD589", "\uC2DD\uC0AC \uB3C4\uC6C0", "\uC678\uCD9C \uB3D9\uD589"].map((s) => `<option>${s}</option>`).join("")}</select><label>\uD76C\uB9DD \uC77C\uC2DC \xB7 \uBE44\uC6CC\uB450\uBA74 \uCD5C\uB300\uD55C \uBE60\uB974\uAC8C</label><input type="datetime-local" name="requestedAt"><div class="notice">\uBE44\uC5B4 \uC788\uB294 \uAC00\uC7A5 \uBE60\uB978 \uC77C\uC815\uC5D0 \uC790\uB3D9 \uC2E0\uCCAD\uD569\uB2C8\uB2E4. \uBCF4\uD638\uC0AC\uAC00 \uC218\uB77D\uD558\uBA74 \uC77C\uC815\uC774 \uD655\uC815\uB429\uB2C8\uB2E4. \uD76C\uB9DD \uC2DC\uAC04\uC5D0 \uC790\uB9AC\uAC00 \uC5C6\uC73C\uBA74 \uADF8 \uC774\uD6C4 \uAC00\uB2A5\uD55C \uC2DC\uAC04\uC744 \uCC3E\uC2B5\uB2C8\uB2E4.</div><button class="btn primary" type="submit">\uC790\uB3D9 \uC2E0\uCCAD \uC2DC\uC5F0 ${icon("arrow")}</button></form>`);
  }
  function reject(id) {
    drawer("\uC218\uD589 \uBD88\uAC00 \uC0AC\uC720", `<p class="subtitle">\uC0AC\uC720\uB97C \uB0A8\uAE30\uBA74 \uC0AC\uD68C\uBCF5\uC9C0\uC0AC\uC5D0\uAC8C \uC870\uC728 \uC694\uCCAD\uC774 \uC804\uB2EC\uB429\uB2C8\uB2E4.</p><form id="reject-form" data-id="${id}"><label>\uBD88\uAC00 \uC0AC\uC720</label><textarea name="reason" required maxlength="1000" placeholder="\uBC29\uBB38\uC774 \uC5B4\uB824\uC6B4 \uC774\uC720\uB97C \uC54C\uB824 \uC8FC\uC138\uC694."></textarea><div class="actions"><button class="btn danger" type="submit">\uC870\uC728 \uC694\uCCAD \uBCF4\uB0B4\uAE30</button></div></form>`);
  }
  function resolveRequest(id) {
    const r = db.requests.find((r2) => r2.id === id);
    drawer("\uC77C\uC815 \uC9C1\uC811 \uC870\uC728", `<div class="notice amber">${esc3(r.reason)}</div><form id="resolve-form" data-id="${id}"><label>\uB2F4\uB2F9 \uC694\uC591\uBCF4\uD638\uC0AC</label><select name="caregiverId">${db.caregivers.filter((c) => c.services.includes(r.service)).map((c) => `<option value="${c.id}">${esc3(c.name)} \xB7 ${hourText(c.from)}\u2013${hourText(c.to)}</option>`).join("")}</select><label>\uC870\uC728\uD55C \uC77C\uC2DC \xB7 \uD55C\uAD6D \uC2DC\uAC04</label><input type="datetime-local" name="start" required><label>\uC870\uC728 \uB0B4\uC5ED</label><textarea name="note" required maxlength="1000" placeholder="\uC5B4\uB974\uC2E0\uACFC \uC5F0\uB77D\uD55C \uB0B4\uC6A9, \uC77C\uC815 \uBCC0\uACBD \uC0AC\uC720 \uB4F1\uC744 \uB0A8\uACA8 \uC8FC\uC138\uC694."></textarea><div class="notice">\uBCF4\uD638\uC0AC\uC640 \uC5B4\uB974\uC2E0\uC758 \uC911\uBCF5 \uC77C\uC815\uC744 \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2E0\uCCAD\uD569\uB2C8\uB2E4. \uBCF4\uD638\uC0AC \uC218\uB77D \uD6C4 \uD655\uC815\uB429\uB2C8\uB2E4.</div><button class="btn primary" type="submit">\uC870\uC728 \uB0B4\uC6A9 \uC800\uC7A5 \xB7 \uC7AC\uC2E0\uCCAD</button></form>`);
  }
  function register() {
    drawer("\uC5B4\uB974\uC2E0 \uB4F1\uB85D", `<p class="subtitle">\uB2F4\uB2F9 \uBCF4\uD638\uC0AC\uAC00 \uAC00\uC785 \uC815\uBCF4\uB97C \uC785\uB825\uD569\uB2C8\uB2E4.</p><form id="register-form"><label>\uC5B4\uB974\uC2E0 \uC131\uD568</label><input name="name" required maxlength="50" autocomplete="off"><label>\uBC29\uBB38 \uC8FC\uC18C</label><input name="address" required maxlength="200" placeholder="\uC815\uD655\uD55C \uB3C4\uB85C\uBA85 \uC8FC\uC18C"><label>\uBCF4\uD638\uC790 \uC5F0\uB77D\uCC98</label><input name="contact" required type="tel" maxlength="30"><div class="notice">\uC8FC\uC18C\uB294 \uB124\uC774\uBC84 Geocoding\uC73C\uB85C \uC88C\uD45C\uB85C \uBCC0\uD658\uD574 \uAC00\uAE4C\uC6B4 \uBCF4\uD638\uC0AC\uB97C \uCC3E\uB294 \uB370 \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uB124\uC774\uBC84 API \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.</div><button class="btn primary" type="submit">\uB4F1\uB85D\uD558\uAE30</button></form>`);
  }
  function availability(id) {
    const c = id ? carer(id) : {};
    drawer(id ? "\uC9C0\uC5ED \xB7 \uADFC\uBB34 \uC2DC\uAC04 \uC218\uC815" : "\uC694\uC591\uBCF4\uD638\uC0AC \uD68C\uC6D0\uAC00\uC785", `<form id="caregiver-form" data-id="${id || ""}">${caregiverFields(c, Boolean(db.demo))}<div class="notice">${id ? "\uC0C8\uB85C\uC6B4 \uBC30\uC815\uBD80\uD130 \uC801\uC6A9\uB429\uB2C8\uB2E4. \uAE30\uC874 \uC77C\uC815\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4." : "\uD76C\uB9DD \uADFC\uBB34 \uC870\uAC74\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4. \uD604\uC7AC\uB294 \uC2DC\uC81C\uD488\uC73C\uB85C \uBCF8\uC778 \uC778\uC99D\xB7\uACC4\uC815 \uB85C\uADF8\uC778\uC740 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."}</div><button class="btn primary" type="submit">${id ? "\uBCC0\uACBD \uB0B4\uC6A9 \uC800\uC7A5" : "\uAC00\uC785\uD558\uACE0 \uC2DC\uC791\uD558\uAE30"}</button></form>`);
  }
  function settings() {
    window.CloverNative?.cancel();
    if (recording || pressed) stopRecording(true);
    if (db.auth) return accountSettings({ user: db.auth.user, connections: db.connections, drawer, api, logout, toast });
    drawer("\uC2DC\uC81C\uD488 \uC5F0\uACB0 \uC0C1\uD0DC", `${window.CloverNative ? '<button class="btn primary" data-do="device-settings">\uC571 \uAE30\uAE30 \uC124\uC815 \uBCC0\uACBD</button>' : ""}<div class="notice">\uD604\uC7AC\uB294 \uAE30\uAE30 \uB0B4 \uCCB4\uD5D8 \uBAA8\uB4DC\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uACC4\uC815 \uB85C\uADF8\uC778\uC744 \uB204\uB974\uBA74 \uC11C\uBC84\uC5D0 \uAC00\uC785\uD558\uACE0 \uB85C\uADF8\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</div><div class="detail-row"><span>\uB85C\uCEEC \uC74C\uC131 \uC778\uC2DD + Ollama</span><span>${db.connections.voice ? "\uC124\uC815\uB428 \xB7 \uC2E4\uC81C \uC5F0\uACB0 \uD655\uC778 \uD544\uC694" : "\uBBF8\uC124\uC815"}</span></div><div class="detail-row"><span>\uB124\uC774\uBC84 \uC8FC\uC18C \uAC80\uC0C9</span><span>${db.connections.maps ? "\uC124\uC815\uB428 \xB7 \uC2E4\uC81C \uC5F0\uACB0 \uD655\uC778 \uD544\uC694" : "\uBBF8\uC124\uC815"}</span></div><div class="detail-row"><span>\uC77C\uC815 \xB7 \uCC98\uB9AC \uAE30\uB85D</span><span>${window.CloverNative?.config.connection === "demo" ? "\uAE30\uAE30 \uB0B4 \uCCB4\uD5D8 \uC800\uC7A5" : "\uC11C\uBC84 \uD30C\uC77C \uC800\uC7A5"}</span></div><p class="subtitle">\uC5F0\uACB0 \uBC29\uBC95\uC740 \uD504\uB85C\uC81D\uD2B8\uC758 README.md \uBC0F .env.example\uC744 \uD655\uC778\uD558\uC138\uC694. \uC124\uC815 \uD6C4 \uC11C\uBC84\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uC138\uC694.</p><div class="notice amber">\uAC70\uB9AC\uC640 \uAC00\uB2A5 \uC2DC\uAC04\uC740 \uAC00\uC0C1 \uB370\uC774\uD130\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uC11C\uBE44\uC2A4\uC5D0\uB294 \uC778\uC99D\xB7\uAD8C\uD55C, \uC54C\uB9BC, \uAE30\uAD00 \uC77C\uC815 \uC5F0\uB3D9, \uC774\uB3D9 \uACBD\uB85C \uACC4\uC0B0\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.</div><div class="actions"><button class="btn primary" data-do="demo">\uAC00\uC0C1 \uC694\uCCAD\uC73C\uB85C \uCCB4\uD5D8\uD558\uAE30</button><a class="btn" href="#elder/e1" data-do="close">\uC5B4\uB974\uC2E0 \uD654\uBA74 \uC5F4\uAE30</a></div>`);
  }
  function speak(text) {
    if (window.CloverNative) {
      void window.CloverNative.speak(text).then((handled) => {
        if (!handled && "speechSynthesis" in window) {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "ko-KR";
          speechSynthesis.speak(u);
        }
      });
      return;
    }
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }
  function resultText(r) {
    if (r.checkin) return r.checkin.outcome === "okay" ? "\uB2F5\uD574 \uC8FC\uC154\uC11C \uACE0\uB9C8\uC6CC\uC694.\n\uD3B8\uC548\uD55C \uC800\uB141 \uBCF4\uB0B4\uC138\uC694." : "\uB9D0\uC500\uC744 \uB0A8\uACBC\uC5B4\uC694.\n\uB2F4\uB2F9 \uC120\uC0DD\uB2D8\uC774 \uD655\uC778\uD560\uAC8C\uC694.";
    if (r.status === "attention") return "\uB2F4\uB2F9 \uC120\uC0DD\uB2D8\uC774 \uD655\uC778\uD558\uACE0\n\uC5F0\uB77D\uB4DC\uB9B4\uAC8C\uC694.";
    if (r.status === "completed") return "\uB3CC\uBD04\uC744 \uB9C8\uCCE4\uC5B4\uC694.\n\uB610 \uD544\uC694\uD558\uC2DC\uBA74 \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.";
    return `${r.requestedAt && r.start !== r.requestedAt ? "\uC6D0\uD558\uC2E0 \uC2DC\uAC04\uC774 \uC5B4\uB824\uC6CC\n\uAC00\uC7A5 \uBE60\uB978 \uC2DC\uAC04\uC73C\uB85C \uC2E0\uCCAD\uD588\uC5B4\uC694.\n" : ""}${fmt(r.start)}
${carer(r.caregiverId)?.name || "\uB2F4\uB2F9"} \uC120\uC0DD\uB2D8\uAED8 ${r.status === "confirmed" ? "\uC77C\uC815\uC774 \uD655\uC815\uB410\uC5B4\uC694." : "\uC2E0\uCCAD\uD588\uC5B4\uC694.\n\uC218\uB77D\uD558\uBA74 \uC54C\uB824\uB4DC\uB9B4\uAC8C\uC694."}`;
  }
  function renderElder() {
    const e = elder(location.hash.split("/")[1]);
    if (!e) {
      $("#app").innerHTML = '<div class="elder"><h1>\uB2F4\uB2F9 \uBCF4\uD638\uC0AC\uC5D0\uAC8C<br>\uAE30\uAE30 \uC5F0\uACB0\uC744 \uBD80\uD0C1\uD574 \uC8FC\uC138\uC694.</h1><button class="btn elder-account" data-do="settings">\uACC4\uC815 \xB7 \uB85C\uADF8\uC544\uC6C3</button></div>';
      return;
    }
    if (elderRendered) {
      wellnessUI?.renderElder();
      return;
    }
    close();
    elderRendered = true;
    lastElderStatus = "";
    $("#app").innerHTML = `<main class="elder">${brand}<div class="elder-content"><h1>${esc3(e.name)} \uC5B4\uB974\uC2E0,<br>\uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?</h1><div id="wellness-elder"></div><p id="mic-guide">\uC544\uB798 \uB9C8\uC774\uD06C\uB97C \uAFB9 \uB204\uB974\uACE0<br>\uD3B8\uD558\uAC8C \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.</p><button class="mic" id="mic" aria-label="\uB204\uB978 \uCC44 \uB9D0\uC500\uD558\uACE0 \uC190\uC744 \uB5BC\uBA74 \uC694\uCCAD\uB429\uB2C8\uB2E4" aria-pressed="false">${icon("mic")}</button><p id="voice-result" class="response" role="status" aria-live="polite">\uC190\uC744 \uB5BC\uBA74 \uBD80\uD0C1\uC774 \uC804\uB2EC\uB3FC\uC694.</p></div><div class="elder-bottom">\uD074\uB85C\uBC84\uAC00 \uACC1\uC5D0\uC11C \uB3C4\uC640\uB4DC\uB9B4\uAC8C\uC694.<br><button class="elder-account" data-do="settings">\uACC4\uC815 \xB7 \uB85C\uADF8\uC544\uC6C3</button>${role !== "elder" ? '<a class="elder-account" href="#elders">\uAD00\uB9AC \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30</a>' : ""}</div></main>`;
    void wellnessUI?.activity();
    wellnessUI?.renderElder();
    const button = $("#mic");
    if (window.CloverNative?.bindRecorder({ button, guide: $("#mic-guide"), message: voiceMessage, ready: () => wellnessUI?.current() ? db.connections.checkinVoice : db.connections.voice, getCheckinId: () => wellnessUI?.current()?.id, getElderId: () => location.hash.split("/")[1], submitted: async (request) => {
      db = await api("state");
      await wellnessUI?.received(request);
      lastElderStatus = request.id + request.status;
      voiceMessage(resultText(request));
    }, failure: (message) => voiceMessage(message) })) return;
    button.addEventListener("pointerdown", (e2) => {
      e2.preventDefault();
      button.setPointerCapture(e2.pointerId);
      startRecording();
    });
    button.addEventListener("pointerup", () => stopRecording());
    button.addEventListener("pointercancel", () => stopRecording(true));
    button.addEventListener("contextmenu", (e2) => e2.preventDefault());
    button.addEventListener("keydown", (e2) => {
      if ([" ", "Enter"].includes(e2.key) && !e2.repeat) {
        e2.preventDefault();
        startRecording();
      }
    });
    button.addEventListener("keyup", (e2) => {
      if ([" ", "Enter"].includes(e2.key)) {
        e2.preventDefault();
        stopRecording();
      }
    });
  }
  function voiceMessage(text, read = true) {
    if ($("#voice-result")) $("#voice-result").textContent = text;
    if (read) speak(text);
  }
  async function startRecording() {
    if (recording || processing || pressed || requestingMic || stoppingMic) return;
    pressed = true;
    cancelRecording = false;
    if (!(wellnessUI?.current() ? db.connections.checkinVoice : db.connections.voice)) {
      pressed = false;
      voiceMessage("\uC544\uC9C1 \uC74C\uC131 \uC11C\uBE44\uC2A4\uB97C \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.\n\uC544\uB798 \uACC4\uC815 \uBA54\uB274\uC5D0\uC11C \uBCF4\uD638\uC0AC\uAC00 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    try {
      if (!window.isSecureContext) throw Error("\uB9C8\uC774\uD06C\uB97C \uC0AC\uC6A9\uD558\uB824\uBA74 HTTPS \uC8FC\uC18C\uB85C \uC811\uC18D\uD574 \uC8FC\uC138\uC694.");
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw Error("\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uB179\uC74C\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC544\uC694. Chrome \uB610\uB294 Safari\uB85C \uC5F4\uC5B4 \uC8FC\uC138\uC694.");
      window.speechSynthesis?.cancel();
      requestingMic = true;
      voiceMessage("\uB9C8\uC774\uD06C\uB97C \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694. \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574 \uC8FC\uC138\uC694.", false);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } finally {
        requestingMic = false;
      }
      if (!pressed) {
        stream.getTracks().forEach((t) => t.stop());
        voiceMessage("\uB9C8\uC774\uD06C\uAC00 \uC900\uBE44\uB410\uC5B4\uC694.\n\uB2E4\uC2DC \uAFB9 \uB204\uB974\uACE0 \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.", false);
        return;
      }
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const recordingElder = location.hash.split("/")[1], recordingCheckin = wellnessUI?.current()?.id;
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelRecording) {
          stoppingMic = false;
          voiceMessage("\uC694\uCCAD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694.", false);
          return;
        }
        processing = true;
        const button = $("#mic");
        if (button) button.disabled = true;
        voiceMessage("\uB9D0\uC500\uD558\uC2E0 \uBD80\uD0C1\uC744\n\uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694.", false);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          if (blob.size < 500) throw Error("\uB9D0\uC500\uC744 \uB4E3\uC9C0 \uBABB\uD588\uC5B4\uC694.\n\uB2E4\uC2DC \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.");
          const res = await fetch("/api/voice?elderId=" + encodeURIComponent(recordingElder) + (recordingCheckin ? "&checkinId=" + encodeURIComponent(recordingCheckin) : ""), { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
          const data = await res.json();
          if (!res.ok) throw Error(data.error);
          db = await api("state");
          await wellnessUI?.received(data);
          lastElderStatus = data.id + data.status;
          voiceMessage(resultText(data));
        } catch (error) {
          voiceMessage(error.message);
        } finally {
          processing = false;
          stoppingMic = false;
          if ($("#mic")) $("#mic").disabled = false;
        }
      };
      recorder.start();
      recording = true;
      $("#mic")?.classList.add("recording");
      $("#mic")?.setAttribute("aria-pressed", "true");
      $("#mic-guide").textContent = "\uB4E3\uACE0 \uC788\uC5B4\uC694. \uD3B8\uD558\uAC8C \uB9D0\uC500\uD558\uC138\uC694.";
      voiceMessage("\uB9D0\uC500\uC744 \uB9C8\uCE58\uBA74 \uC190\uC744 \uB5BC \uC8FC\uC138\uC694.", false);
      maxTimer = setTimeout(() => stopRecording(), 6e4);
    } catch (error) {
      pressed = false;
      stream?.getTracks().forEach((t) => t.stop());
      voiceMessage(microphoneError(error));
    }
  }
  function stopRecording(cancel = false) {
    pressed = false;
    cancelRecording ||= cancel;
    clearTimeout(maxTimer);
    if (recording) {
      recording = false;
      stoppingMic = true;
      if (recorder.state !== "inactive") recorder.stop();
      else stoppingMic = false;
      $("#mic")?.classList.remove("recording");
      $("#mic")?.setAttribute("aria-pressed", "false");
      if ($("#mic-guide")) $("#mic-guide").textContent = "\uB2E4\uC74C \uBD80\uD0C1\uB3C4 \uB9C8\uC774\uD06C\uB97C \uAFB9 \uB20C\uB7EC \uB9D0\uC500\uD558\uC138\uC694.";
    }
  }
  function filterRows() {
    let rows = db.requests;
    if (role === "caregiver") rows = rows.filter((r) => r.caregiverId === selectedCaregiver);
    if (page === "history") rows = rows.filter((r) => r.status === "completed");
    const term = $("#search")?.value.trim() || "", status = $("#filter")?.value;
    rows = rows.filter((r) => elder(r.elderId).name.includes(term) && (!status || r.status === status));
    $("#request-table").innerHTML = table(rows, "\uB3CC\uBD04 \uC77C\uC815");
  }
  async function logout(alreadyRevoked = false) {
    window.CloverNative?.cancel();
    if (recording || pressed) stopRecording(true);
    window.speechSynthesis?.cancel();
    if (window.CloverNative) return window.CloverNative.logout(alreadyRevoked);
    if (!alreadyRevoked) {
      try {
        await api("auth/logout", {});
      } catch (e) {
        if (e.status !== 401) throw e;
      }
    }
    history.replaceState(null, "", location.pathname + location.search);
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("caregiver");
    location.reload();
  }
  async function start() {
    if (!window.CloverNative) {
      const result = await authenticate({ api });
      role = result.user.role;
      selectedCaregiver = result.user.caregiverId;
      if (role !== "elder" && location.hash.startsWith("#elder/")) history.replaceState(null, "", location.pathname + location.search + "#" + (role === "caregiver" ? "requests" : "overview"));
    }
    await refresh();
  }
  var $, esc3, icons, icon, brand, labels, fmt, shortDate, wellnessUI, db, role, page, selectedCaregiver, elderRendered, lastElderStatus, toastTimer, elder, carer, badge, stoppingMic, requestingMic, pressed, recorder, stream, recording, processing, maxTimer, cancelRecording;
  var init_app = __esm({
    "public/app.js"() {
      init_auth_ui();
      init_caregiver_fields();
      init_wellness_ui();
      $ = (s) => document.querySelector(s);
      esc3 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      icons = { grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 4h.01m4 0h.01"/>', people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a5 5 0 0 0-2-4"/>', heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 7 8 14c9-7 11-11 8-14Z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="m5 12 4 4L19 6"/>', arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', plus: '<path d="M12 5v14M5 12h14"/>', bell: '<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Zm5 4h4"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3h6l1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3Z"/>', mic: '<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', leaf: '<path d="M12 12C-3 9 6-5 12 6c6-11 15 3 0 6Zm0 0c15 3 6 17 0 6-6 11-15-3 0-6Z"/>' };
      icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.heart}</svg>`;
      brand = `<div class="brand">${icon("leaf")}clover<span style="color:#a2b18f">.</span></div>`;
      labels = { attention: "\uC870\uC728 \uD544\uC694", pending: "\uC218\uB77D \uB300\uAE30", confirmed: "\uC77C\uC815 \uD655\uC815", completed: "\uB3CC\uBD04 \uC644\uB8CC" };
      fmt = (t) => t ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t) : "\uC2DC\uAC04 \uC870\uC728 \uC911";
      shortDate = (t) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).format(t);
      role = sessionStorage.getItem("role") || "social";
      page = "overview";
      selectedCaregiver = sessionStorage.getItem("caregiver") || "c1";
      elderRendered = false;
      lastElderStatus = "";
      elder = (id) => db.elders.find((e) => e.id === id);
      carer = (id) => db.caregivers.find((c) => c.id === id);
      badge = (r) => `<span class="pill ${r.status}">${labels[r.status]}</span>`;
      stoppingMic = false;
      requestingMic = false;
      pressed = false;
      recording = false;
      processing = false;
      cancelRecording = false;
      window.addEventListener("blur", () => {
        if (recording || pressed) stopRecording(true);
      });
      window.addEventListener("hashchange", () => {
        window.CloverNative?.cancel();
        if (recording || pressed) stopRecording(true);
        elderRendered = false;
        render();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Enter" && e.target.matches("tr[data-open]")) detail(e.target.dataset.open);
        if (e.key === "Tab" && $(".drawer")) {
          const elements = [...$(".drawer").querySelectorAll("button,a,input,select,textarea")].filter((el) => !el.disabled);
          const first = elements[0], last = elements.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
      document.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-do],[data-open],[data-action],[data-reject],[data-resolve],[data-availability]");
        if (!target) {
          if (e.target.classList.contains("drawer-shade")) close();
          return;
        }
        try {
          const d = target.dataset;
          if (d.open) return detail(d.open);
          if (d.reject) return reject(d.reject);
          if (d.resolve) return resolveRequest(d.resolve);
          if (d.availability) return availability(d.availability);
          if (d.action) {
            target.disabled = true;
            await api("action", { id: d.id, action: d.action });
            await refresh();
            detail(d.id);
            toast("\uCC98\uB9AC \uB0B4\uC6A9\uC744 \uC800\uC7A5\uD588\uC5B4\uC694.");
            return;
          }
          switch (d.do) {
            case "account-login":
              await window.CloverNative?.login();
              break;
            case "device-settings":
              window.CloverNative?.openSettings();
              break;
            case "pair-code": {
              const p = await api("auth/pair-code", { elderId: d.id });
              drawer("\uC5B4\uB974\uC2E0 \uAE30\uAE30 \uC5F0\uACB0", `<p>\uC5B4\uB974\uC2E0 \uD734\uB300\uD3F0\uC758 \uB85C\uADF8\uC778 \uD654\uBA74\uC5D0\uC11C \u2018\uC5B4\uB974\uC2E0 \uC5F0\uACB0 \uCF54\uB4DC \uC785\uB825\u2019\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.</p><div class="pair-code">${esc3(p.code)}</div><p>10\uBD84 \uB3D9\uC548 \uD55C \uBC88\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uCF54\uB4DC\uB97C \uC785\uB825\uD558\uBA74 \uB9C8\uC774\uD06C \uD654\uBA74\uC73C\uB85C \uC5F0\uACB0\uB429\uB2C8\uB2E4.</p>`);
              break;
            }
            case "close":
              close();
              break;
            case "demo":
              demo();
              break;
            case "register":
              register();
              break;
            case "caregiver-signup":
              availability();
              break;
            case "settings":
              settings();
              break;
            case "role":
              if (db.auth) throw Error("\uACC4\uC815 \uAD8C\uD55C\uC740 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
              role = ["social", "admin"].includes(role) ? "caregiver" : "social";
              sessionStorage.setItem("role", role);
              location.hash = role === "caregiver" ? "requests" : "overview";
              render();
              break;
          }
        } catch (error) {
          toast(error.message);
          target.disabled = false;
        }
      });
      document.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        if (!["demo-form", "reject-form", "resolve-form", "register-form", "availability-form", "caregiver-form"].includes(form.id)) return;
        const values = Object.fromEntries(new FormData(form)), button = form.querySelector('[type="submit"]');
        if (!button) return;
        button.disabled = true;
        try {
          let result;
          if (form.id === "caregiver-form") {
            const c = await api("caregivers", { ...caregiverValues(form), id: form.dataset.id || void 0 });
            if (!form.dataset.id) {
              selectedCaregiver = c.id;
              role = "caregiver";
              sessionStorage.setItem("role", role);
              sessionStorage.setItem("caregiver", c.id);
              await window.CloverNative?.selectCaregiver?.(c.id);
              location.hash = "caregivers";
            }
          } else if (form.id === "demo-form") {
            result = await api("demo-request", { ...values, requestedAt: values.requestedAt ? Date.parse(values.requestedAt + ":00+09:00") : null });
          } else if (form.id === "reject-form") {
            result = await api("action", { id: form.dataset.id, action: "reject", ...values });
          } else if (form.id === "resolve-form") {
            result = await api("action", { id: form.dataset.id, action: "resolve", ...values, start: values.start + ":00+09:00" });
          } else if (form.id === "register-form") {
            await api("elders", values);
          } else if (form.id === "availability-form") {
            await api("availability", { id: form.dataset.id, from: Number(values.from), to: Number(values.to), days: new FormData(form).getAll("days").map(Number) });
          }
          await refresh();
          close();
          if (result) detail(result.id);
          toast("\uC800\uC7A5\uD588\uC5B4\uC694.");
        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      });
      document.addEventListener("input", (e) => {
        if (e.target.id === "search") filterRows();
      });
      document.addEventListener("change", (e) => {
        if (e.target.id === "filter") filterRows();
        if (e.target.id === "caregiver-select") {
          selectedCaregiver = e.target.value;
          sessionStorage.setItem("caregiver", selectedCaregiver);
          render();
        }
      });
      setInterval(async () => {
        if (!db || !location.hash.startsWith("#elder/") || recording || processing || window.CloverNative?.busy) return;
        try {
          db = await api("state");
          if (wellnessUI?.renderElder()) return;
          const r = db.requests.find((r2) => r2.elderId === location.hash.split("/")[1]);
          if (r && r.id + r.status !== lastElderStatus) {
            lastElderStatus = r.id + r.status;
            voiceMessage(resultText(r), r.status !== "completed");
          }
        } catch {
        }
      }, 7e3);
      wellnessUI = createWellnessUI({ api, getState: () => db, refresh, drawer, close, speak, escape: esc3, formatTime: fmt, isRecording: () => recording || processing || pressed });
      setInterval(async () => {
        if (!db || document.visibilityState === "hidden" || location.hash.startsWith("#elder/") || $("#overlay").innerHTML || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        try {
          db = await api("state");
          if (page === "wellness" || page === "overview") render();
        } catch {
        }
      }, 15e3);
      start().catch((error) => {
        $("#app").innerHTML = '<div class="elder"><h1>\uC11C\uBC84\uC5D0 \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.</h1><p>\uC11C\uBC84 \uC2E4\uD589 \uC0C1\uD0DC\uB97C \uD655\uC778\uD55C \uB4A4 \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694.</p></div>';
        if (window.CloverNative) {
          const recovery = document.createElement("button");
          recovery.className = "btn primary";
          recovery.textContent = "\uB2F4\uB2F9\uC790 \uAE30\uAE30 \uC124\uC815";
          recovery.onclick = () => window.CloverNative.openSettings();
          $("#app .elder")?.append(recovery);
        }
        toast(error.message);
      });
    }
  });

  // public/native-bridge.js
  var pending = /* @__PURE__ */ new Map();
  var seq = 0;
  function nativeCall(method, args = {}) {
    return new Promise((resolve, reject2) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject2(Error("\uC571 \uC751\uB2F5\uC774 \uC9C0\uC5F0\uB418\uACE0 \uC788\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."));
      }, 145e3);
      pending.set(id, { resolve, reject: reject2, timer });
      window.ReactNativeWebView.postMessage(JSON.stringify({ id, method, args }));
    });
  }
  window.cloverBridgeReply = ({ id, value, error }) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    error ? p.reject(Error(error)) : p.resolve(value);
  };

  // public/hosted.js
  init_auth_ui();

  // mobile/core.mjs
  function createHoldRecorder({ recorder: recorder2, onState, onAudio, onError, maxMs = 6e4 }) {
    let phase = "idle", holding = false, cancelled = false, timer;
    const change = (value) => {
      phase = value;
      onState(value);
    };
    async function finish() {
      if (phase !== "recording") return;
      clearTimeout(timer);
      change("stopping");
      try {
        if (cancelled) {
          await recorder2.cancel();
          return;
        }
        const audio = await recorder2.stop();
        if (!cancelled) {
          change("sending");
          await onAudio(audio);
        }
      } catch (error) {
        if (!cancelled) onError(error);
      } finally {
        holding = false;
        change("idle");
      }
    }
    return {
      get phase() {
        return phase;
      },
      async press() {
        if (phase !== "idle") return;
        holding = true;
        cancelled = false;
        change("starting");
        try {
          await recorder2.permission();
          if (!holding || cancelled) {
            change("idle");
            return;
          }
          await recorder2.start();
          change("recording");
          if (!holding || cancelled) await finish();
          else timer = setTimeout(() => {
            holding = false;
            void finish();
          }, maxMs);
        } catch (error) {
          holding = false;
          try {
            await recorder2.cancel();
          } catch {
          }
          change("idle");
          if (!cancelled) onError(error);
        }
      },
      release(cancel = false) {
        holding = false;
        cancelled ||= cancel;
        return finish();
      }
    };
  }

  // public/hosted.js
  var controller;
  var identity;
  var restarting = false;
  async function api2(path, body) {
    const r = await nativeCall("api", { path: "/api/" + path, method: body ? "POST" : "GET", body });
    if (r.status < 200 || r.status >= 300) {
      if (r.status === 401 && !path.startsWith("auth/")) restart();
      throw Object.assign(Error(r.data.error || "\uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."), { status: r.status });
    }
    return r.data;
  }
  function restart() {
    if (restarting) return;
    restarting = true;
    void controller?.release(true);
    location.reload();
  }
  function bindRecorder({ button, guide, message, ready, getElderId, getCheckinId, submitted, failure }) {
    let elderId, checkinId;
    controller = createHoldRecorder({ recorder: { permission: async () => {
      await nativeCall("speech.stop");
      const p = await nativeCall("audio.request");
      if (!p.granted) throw Error("\uB9C8\uC774\uD06C \uC0AC\uC6A9\uC744 \uD5C8\uC6A9\uD574 \uC8FC\uC138\uC694.");
    }, start: () => nativeCall("audio.start"), cancel: () => nativeCall("audio.cancel"), stop: () => nativeCall("audio.stop") }, onState: (phase) => {
      const recording2 = phase === "recording";
      button.classList.toggle("recording", recording2);
      button.setAttribute("aria-pressed", String(recording2));
      button.disabled = ["stopping", "sending"].includes(phase);
      if (recording2) {
        guide.textContent = "\uB4E3\uACE0 \uC788\uC5B4\uC694. \uD3B8\uD558\uAC8C \uB9D0\uC500\uD558\uC138\uC694.";
        message("\uB9D0\uC500\uC744 \uB9C8\uCE58\uBA74 \uC190\uC744 \uB5BC \uC8FC\uC138\uC694.", false);
      } else if (phase === "sending") message("\uB9D0\uC500\uD558\uC2E0 \uBD80\uD0C1\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694.", false);
      else if (phase === "idle") guide.textContent = "\uC544\uB798 \uB9C8\uC774\uD06C\uB97C \uAFB9 \uB204\uB974\uACE0 \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.";
    }, onAudio: async (audio) => {
      if (audio.duration < 350) throw Error("\uC870\uAE08 \uB354 \uAE38\uAC8C \uB9D0\uC500\uD574 \uC8FC\uC138\uC694.");
      const result = await api2("voice-json", { elderId, checkinId, audioBase64: audio.base64, mimeType: "audio/mp4" });
      await submitted(result);
    }, onError: (e) => failure(e.message) });
    const press = () => {
      if (!ready()) {
        message("\uC544\uC9C1 \uC74C\uC131 \uC11C\uBE44\uC2A4\uB97C \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC544\uB798 \uACC4\uC815 \uBA54\uB274\uC5D0\uC11C \uBCF4\uD638\uC0AC\uAC00 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
        return;
      }
      elderId = getElderId();
      checkinId = getCheckinId?.();
      void controller.press();
    };
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      press();
    });
    button.addEventListener("pointerup", () => void controller.release());
    button.addEventListener("pointercancel", () => void controller.release(true));
    button.addEventListener("contextmenu", (e) => e.preventDefault());
    button.addEventListener("keydown", (e) => {
      if ([" ", "Enter"].includes(e.key) && !e.repeat) {
        e.preventDefault();
        press();
      }
    });
    button.addEventListener("keyup", (e) => {
      if ([" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        void controller.release();
      }
    });
    return true;
  }
  async function push(requestPermission, enable = false) {
    const result = await nativeCall("push.sync", { requestPermission, enable });
    window.CloverNative.pushStatus = result.message;
    window.dispatchEvent(new Event("clover-push-status"));
    return result;
  }
  async function boot() {
    if (!window.ReactNativeWebView) {
      await Promise.resolve().then(() => (init_app(), app_exports));
      return;
    }
    document.documentElement.classList.add("installed-app");
    identity = await authenticate({ api: api2 });
    const user = identity.user;
    window.CloverNative = { api: api2, bindRecorder, config: { connection: "server", role: user.role, caregiverId: user.caregiverId, elderId: user.elderId }, modeLabel: "\uACC4\uC815 \uC5F0\uACB0\uB428", get busy() {
      return Boolean(controller && controller.phase !== "idle");
    }, cancel: () => void controller?.release(true), speak: async (text) => {
      await nativeCall("speech.stop");
      await nativeCall("speech.speak", { text });
      return true;
    }, logout: async (revoked) => {
      if (!revoked) {
        try {
          await api2("auth/logout", {});
        } catch (e) {
          if (e.status !== 401) throw e;
        }
      }
      await nativeCall("auth.clear");
      restart();
    }, openSettings: () => void nativeCall("settings"), enablePush: () => push(true, true), clearCheckinNotifications: (id) => nativeCall("push.clear", { id }) };
    if (user.role === "elder") location.hash = "elder/" + user.elderId;
    else if (!location.hash || location.hash.startsWith("#elder/")) location.hash = ["social", "admin"].includes(user.role) ? "overview" : "requests";
    window.addEventListener("clover-native-active", () => {
      window.dispatchEvent(new Event("clover-foreground"));
      void push(false).catch(() => {
      });
    });
    window.addEventListener("clover-native-inactive", () => {
      void controller?.release(true);
    });
    window.addEventListener("clover-native-back", () => {
      if (controller?.phase !== "idle" && controller) {
        void controller.release(true);
        return;
      }
      if (document.querySelector(".drawer")) {
        document.querySelector('[data-do="close"]')?.click();
        return;
      }
      if (user.role === "elder" || ["#overview", "#requests"].includes(location.hash)) {
        void nativeCall("exit");
        return;
      }
      location.hash = ["social", "admin"].includes(user.role) ? "overview" : "requests";
    });
    window.addEventListener("clover-native-notification", () => {
      location.hash = user.role === "elder" ? "elder/" + user.elderId : ["social", "admin"].includes(user.role) ? "wellness" : "requests";
      window.dispatchEvent(new Event("clover-foreground"));
    });
    await Promise.resolve().then(() => (init_app(), app_exports));
    await nativeCall("ready");
    void push(true).catch(() => {
      window.CloverNative.pushStatus = "\uC54C\uB9BC \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC571 \uC124\uC815\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
    });
    let timer;
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".elder .brand")) timer = setTimeout(() => void nativeCall("settings"), 4e3);
    });
    for (const event of ["pointerup", "pointercancel"]) document.addEventListener(event, () => clearTimeout(timer));
  }
  boot().catch((e) => {
    const app = document.getElementById("app");
    app.replaceChildren();
    const main = document.createElement("main");
    main.className = "device-setup";
    const title = document.createElement("h1");
    title.textContent = "\uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
    const message = document.createElement("p");
    message.textContent = e.message;
    const retry = document.createElement("button");
    retry.className = "btn primary";
    retry.textContent = "\uB2E4\uC2DC \uC5F0\uACB0";
    retry.onclick = () => location.reload();
    main.append(title, message, retry);
    if (window.ReactNativeWebView) {
      const settings2 = document.createElement("button");
      settings2.className = "btn";
      settings2.textContent = "\uC6F9 \uC11C\uBC84 \uC124\uC815";
      settings2.onclick = () => void nativeCall("settings");
      main.append(settings2);
    }
    app.append(main);
  });
})();
