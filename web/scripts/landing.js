import { requestEarlyAccess } from "./api.js";

const earlyAccessForm = document.getElementById("earlyAccessForm");
const earlyAccessEmail = document.getElementById("earlyAccessEmail");
const earlyAccessXHandle = document.getElementById("earlyAccessXHandle");
const earlyAccessStatus = document.getElementById("earlyAccessStatus");

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

earlyAccessForm.addEventListener("submit", submitEarlyAccess);
