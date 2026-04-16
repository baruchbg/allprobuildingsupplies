/* contact.mjs — wires the fake-send button. */
import { wireContactSubmit } from "../assets/ui.mjs";
document.addEventListener("apbs:ready", () => { wireContactSubmit(); });
