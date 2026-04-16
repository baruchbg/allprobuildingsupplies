/* login.mjs — login + change-password tabs. Uses the fixed auth.mjs. */
import { $, $$ } from "../assets/ui.mjs";
import { doLogin, doChangePassword } from "../assets/auth.mjs";

function showMsg(type, msg, isError) {
  const el = $("#" + type + "-msg");
  el.textContent = msg;
  el.className = "auth-msg " + (isError ? "msg-err" : "msg-ok");
  el.style.display = "block";
}

function switchAuth(target) {
  $$(".auth-tab").forEach((t) => t.classList.remove("active"));
  $$(".auth-form").forEach((f) => f.classList.remove("active"));
  $("#tab-" + target).classList.add("active");
  $("#form-" + target).classList.add("active");
  $$(".auth-msg").forEach((m) => (m.style.display = "none"));
}

async function onLogin() {
  const btn = $("#btn-login");
  btn.disabled = true; btn.textContent = "Verifying...";
  const email = $("#log-email").value.trim();
  const pass  = $("#log-pass").value.trim();
  const res = await doLogin(email, pass);
  if (!res.ok) { showMsg("login", res.msg, true); }
  else {
    showMsg("login", "Login successful! Redirecting...", false);
    setTimeout(() => { location.href = "products.html"; }, 800);
  }
  btn.disabled = false; btn.textContent = "Sign In";
}

async function onChange() {
  const btn = $("#btn-change");
  btn.disabled = true; btn.textContent = "Updating...";
  const email = $("#chg-email").value.trim();
  const o = $("#chg-old-pass").value.trim();
  const n = $("#chg-new-pass").value.trim();
  const r = await doChangePassword(email, o, n);
  if (!r.ok) showMsg("change", r.msg, true);
  else {
    showMsg("change", "Password updated successfully! Please login.", false);
    $("#chg-old-pass").value = ""; $("#chg-new-pass").value = "";
    setTimeout(() => { switchAuth("login"); $("#log-email").value = email; }, 1600);
  }
  btn.disabled = false; btn.textContent = "Update Password";
}

document.addEventListener("apbs:ready", () => {
  $$(".auth-tab").forEach((t) => t.addEventListener("click", () => switchAuth(t.dataset.tab)));
  $("#btn-login").addEventListener("click", onLogin);
  $("#btn-change").addEventListener("click", onChange);
  $("#log-pass").addEventListener("keypress", (e) => { if (e.key === "Enter") onLogin(); });
});
