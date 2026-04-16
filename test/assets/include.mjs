/* include.mjs — tiny client-side partial loader.
 * Any <div data-include="partials/foo.html"></div> is replaced by
 * the fetched partial's innerHTML. After all includes resolve,
 * we boot the shell (cursor/reveal/nav/hamburger/banner) and
 * fire an "apbs:ready" event that per-page scripts listen for.
 */
import { bootShell } from "./ui.mjs";

async function loadAll() {
  const nodes = Array.from(document.querySelectorAll("[data-include]"));
  await Promise.all(nodes.map(async (host) => {
    const url = host.getAttribute("data-include");
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const html = await r.text();
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      host.replaceWith(tpl.content.cloneNode(true));
    } catch (e) {
      console.warn("Failed to load partial", url, e);
      host.remove();
    }
  }));
}

loadAll().then(() => {
  bootShell();
  document.dispatchEvent(new CustomEvent("apbs:ready"));
});
