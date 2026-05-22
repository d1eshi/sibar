import { requestEarlyAccess } from "./api.js";

const earlyAccessForm = document.getElementById("earlyAccessForm");
const earlyAccessEmail = document.getElementById("earlyAccessEmail");
const earlyAccessXHandle = document.getElementById("earlyAccessXHandle");
const earlyAccessStatus = document.getElementById("earlyAccessStatus");
const rotatingSource = document.getElementById("rotatingSource");

async function submitEarlyAccess(event) {
  event.preventDefault();
  const email = earlyAccessEmail.value.trim();
  const xHandle = earlyAccessXHandle.value.trim();
  earlyAccessStatus.textContent = "Enviando...";
  try {
    await requestEarlyAccess({ email, xHandle });
    earlyAccessForm.reset();
    earlyAccessStatus.textContent = "Listo. Te contacto cuando abramos la siguiente tanda.";
  } catch (error) {
    earlyAccessStatus.textContent = error instanceof Error ? error.message : "No se pudo pedir acceso.";
  }
}

if (earlyAccessForm && earlyAccessEmail && earlyAccessXHandle && earlyAccessStatus) {
  earlyAccessForm.addEventListener("submit", submitEarlyAccess);
}

if (rotatingSource && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const terms = rotatingSource.dataset.terms.split(",").map((term) => term.trim()).filter(Boolean);
  let termIndex = 0;
  window.setInterval(() => {
    termIndex = (termIndex + 1) % terms.length;
    rotatingSource.classList.add("is-switching");
    window.setTimeout(() => {
      rotatingSource.textContent = terms[termIndex];
      rotatingSource.classList.remove("is-switching");
    }, 180);
  }, 1800);
}
