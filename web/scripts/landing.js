import { requestEarlyAccess } from "./api.js";

const demoStates = {
  source: {
    evidenceTitle: "Debt boundary",
    code: `generated:
  - auth middleware
  - cached data loader
  - optimistic save path

unknown:
  - invalidation rule
  - retry behavior`,
    pills: ["owned", "bounded", "transferable"],
    workTitle: "Can you change it?",
    question: "Si cambia el cache key, que comportamiento se rompe primero y donde lo verificas?",
    answer: "Todavia hay deuda cognitiva: podes nombrar la pieza, pero no predecir su fallo con evidencia.",
    resultTitle: "Debt abierto",
    readiness: 42,
    result: "Gap detectado: entendimiento nominal sin capacidad de cambio. La reparacion es una modificacion pequena con prediccion previa.",
    repairs: [
      "Marcar la funcion que define el cache key.",
      "Predecir que estado queda stale despues del cambio.",
      "Hacer un patch minimo y explicar por que no rompe el loader."
    ]
  },
  question: {
    evidenceTitle: "Ownership slice",
    code: `claim under test:
  "this loader is safe to reuse"

evidence needed:
  - cache key source
  - invalidation trigger
  - stale-state test`,
    pills: ["claim under test", "needs evidence", "change-ready"],
    workTitle: "Ownership check",
    question: "Explicalo como si fueras a tocarlo manana: que input produce stale data y que archivo confirma tu respuesta?",
    answer: "Respuesta rapida: 'hay que limpiar cache'. Falta ubicar el mecanismo y probar que el cambio aplica.",
    resultTitle: "Gap activo",
    readiness: 54,
    result: "Sibar mantiene el gap abierto hasta que el usuario conecta codigo, comportamiento y evidencia.",
    repairs: [
      "Citar el loader exacto.",
      "Nombrar la condicion que invalida el cache.",
      "Describir el cambio minimo antes de tocar el archivo."
    ]
  },
  readiness: {
    evidenceTitle: "Understanding memory",
    code: `attempt:
  "changing the key without invalidating pending saves leaves stale UI"

evidence:
  - cites loader
  - cites save path
  - predicts stale state

verdict:
  bounded readiness for this change`,
    pills: ["retained", "evidence-backed", "replicable"],
    workTitle: "Repair accepted",
    question: "Ahora si: que parte podes cambiar sin fingir seguridad?",
    answer: "Respuesta con evidencia: puedo tocar el cache key si tambien invalido el pending save path y cubro el stale-state case.",
    resultTitle: "Ready: bounded",
    readiness: 86,
    result: "Readiness acotado: podes cambiar esta parte, explicar el riesgo y transferir el patron a otro loader. No implica dominar todo el repo.",
    repairs: [
      "Guardar el patron como memoria reutilizable.",
      "Repetirlo en otro loader parecido.",
      "Retestear despues de una demora para medir retencion."
    ]
  }
};

const elements = {
  shell: document.querySelector(".demo-shell"),
  stepButtons: [...document.querySelectorAll("[data-step]")],
  runButton: document.getElementById("runDemoBtn"),
  answerButtons: [...document.querySelectorAll("[data-demo-answer]")],
  evidenceTitle: document.getElementById("evidenceTitle"),
  code: document.getElementById("demoCode"),
  pills: document.getElementById("evidencePills"),
  workTitle: document.getElementById("workTitle"),
  question: document.getElementById("workQuestion"),
  answer: document.getElementById("answerText"),
  resultTitle: document.getElementById("resultTitle"),
  readiness: document.getElementById("readinessFill"),
  result: document.getElementById("resultCopy"),
  repairs: document.getElementById("repairList"),
  earlyAccessForm: document.getElementById("earlyAccessForm"),
  earlyAccessEmail: document.getElementById("earlyAccessEmail"),
  earlyAccessXHandle: document.getElementById("earlyAccessXHandle"),
  earlyAccessStatus: document.getElementById("earlyAccessStatus")
};

let activeStep = "source";
let runTimer = null;

function renderStep(step) {
  const state = demoStates[step];
  activeStep = step;
  elements.shell.dataset.activeStep = step;
  elements.stepButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.step === step);
  });

  elements.evidenceTitle.textContent = state.evidenceTitle;
  elements.code.textContent = state.code;
  elements.pills.innerHTML = state.pills
    .map((pill, index) => `<span class="pill${index === 0 ? " strong" : ""}">${pill}</span>`)
    .join("");
  elements.workTitle.textContent = state.workTitle;
  elements.question.textContent = state.question;
  elements.answer.textContent = state.answer;
  elements.resultTitle.textContent = state.resultTitle;
  elements.readiness.style.width = `${state.readiness}%`;
  elements.readiness.parentElement.setAttribute("aria-label", `Readiness ${state.readiness} por ciento`);
  elements.result.textContent = state.result;
  elements.repairs.innerHTML = state.repairs.map((repair) => `<li>${repair}</li>`).join("");
}

function runDemo() {
  window.clearInterval(runTimer);
  const sequence = ["source", "question", "readiness"];
  let index = sequence.indexOf(activeStep);
  elements.runButton.textContent = "Running...";
  renderStep(sequence[index]);
  runTimer = window.setInterval(() => {
    index += 1;
    if (index >= sequence.length) {
      window.clearInterval(runTimer);
      elements.runButton.textContent = "Run loop";
      return;
    }
    renderStep(sequence[index]);
  }, 850);
}

function setAnswer(kind) {
  if (kind === "strong") {
    renderStep("readiness");
    return;
  }
  renderStep("question");
}

async function submitEarlyAccess(event) {
  event.preventDefault();
  const email = elements.earlyAccessEmail.value.trim();
  const xHandle = elements.earlyAccessXHandle.value.trim();
  elements.earlyAccessStatus.textContent = "Enviando...";
  try {
    await requestEarlyAccess({ email, xHandle });
    elements.earlyAccessForm.reset();
    elements.earlyAccessStatus.textContent = "Listo. Te contacto cuando abramos la siguiente tanda.";
  } catch (error) {
    elements.earlyAccessStatus.textContent = error instanceof Error ? error.message : "No se pudo pedir acceso.";
  }
}

elements.stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.clearInterval(runTimer);
    elements.runButton.textContent = "Run loop";
    renderStep(button.dataset.step);
  });
});

elements.answerButtons.forEach((button) => {
  button.addEventListener("click", () => setAnswer(button.dataset.demoAnswer));
});

elements.runButton.addEventListener("click", runDemo);
elements.earlyAccessForm.addEventListener("submit", submitEarlyAccess);

renderStep(activeStep);
