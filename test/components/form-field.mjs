/* form-field.mjs — standardized labelled input/select/textarea. */
import { esc } from "../assets/ui.mjs";

export function field({ id, label, type = "text", value = "", required = false, placeholder = "", autocomplete = "", hint = "" } = {}) {
  const req = required ? " required" : "";
  const ph = placeholder ? ` placeholder="${esc(placeholder)}"` : "";
  const ac = autocomplete ? ` autocomplete="${esc(autocomplete)}"` : "";
  const h = hint ? `<div class="field-hint">${esc(hint)}</div>` : "";

  let control;
  if (type === "textarea") {
    control = `<textarea id="${esc(id)}" name="${esc(id)}"${req}${ph}>${esc(value)}</textarea>`;
  } else {
    control = `<input type="${esc(type)}" id="${esc(id)}" name="${esc(id)}" value="${esc(value)}"${req}${ph}${ac}/>`;
  }

  return `<div class="field">
    <label for="${esc(id)}">${esc(label)}${required ? ' <span style="color:var(--gold)">*</span>' : ""}</label>
    ${control}
    ${h}
  </div>`;
}

export function selectField({ id, label, options = [], value = "", required = false } = {}) {
  const req = required ? " required" : "";
  const opts = options
    .map((o) => {
      const v = typeof o === "string" ? o : o.value;
      const l = typeof o === "string" ? o : o.label;
      return `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`;
    })
    .join("");
  return `<div class="field">
    <label for="${esc(id)}">${esc(label)}${required ? ' <span style="color:var(--gold)">*</span>' : ""}</label>
    <select id="${esc(id)}" name="${esc(id)}"${req}>${opts}</select>
  </div>`;
}
