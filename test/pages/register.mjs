/* register.mjs — trade-account registration form. */
import { $, $$, esc } from "../assets/ui.mjs";
import { doRegister } from "../assets/auth.mjs";

function v(id, errId, test) {
  const el = $("#" + id);
  const ok = test(el.value.trim());
  el.classList.toggle("err", !ok);
  $("#" + errId).style.display = ok ? "none" : "block";
  return ok;
}

function showErr(msg) {
  const el = $("#global-err");
  el.innerHTML = msg;
  el.style.display = "block";
}

async function submitReg() {
  const ok = [
    v("r-fname",   "e-fname",   (x) => x.length > 0),
    v("r-lname",   "e-lname",   (x) => x.length > 0),
    v("r-company", "e-company", (x) => x.length > 0),
    v("r-email",   "e-email",   (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)),
    v("r-phone",   "e-phone",   (x) => x.length > 5),
    v("r-pw",      "e-pw",      (x) => x.length >= 6),
    v("r-pw2",     "e-pw2",     (x) => x === $("#r-pw").value)
  ].every(Boolean);
  if (!ok) return;

  const btn = $("#reg-btn"), txt = $("#reg-txt");
  btn.disabled = true;
  txt.innerHTML = '<span style="display:inline-block;animation:spin .8s linear infinite">\u231b</span> Submitting...';
  $("#global-err").style.display = "none";

  const data = {
    fname:   $("#r-fname").value,
    lname:   $("#r-lname").value,
    company: $("#r-company").value,
    email:   $("#r-email").value,
    phone:   $("#r-phone").value,
    password: $("#r-pw").value
  };

  try {
    const r = await doRegister(data);
    if (!r.ok) {
      if (r.dupe) showErr('An account with this email already exists. <a href="login.html" style="color:var(--gold)">Log in \u2192</a>');
      else showErr(esc(r.msg || "Unable to register."));
      btn.disabled = false; txt.innerHTML = "Submit Request \u2192";
      return;
    }
    $("#reg-form").style.display = "none";
    $("#s-name").textContent = r.user.fname;
    $("#s-email").textContent = r.user.email;
    $("#reg-success").style.display = "block";
  } catch (e) {
    showErr("Something went wrong \u2014 please try again. (" + esc(e.message) + ")");
    btn.disabled = false; txt.innerHTML = "Submit Request \u2192";
  }
}

document.addEventListener("apbs:ready", () => {
  $("#reg-btn").addEventListener("click", submitReg);
  $$(".fi").forEach((i) => i.addEventListener("input", () => {
    i.classList.remove("err");
    $("#global-err").style.display = "none";
  }));
});
