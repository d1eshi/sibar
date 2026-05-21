import { requestEarlyAccess } from "./api.js";

const demoStates = {
  source: {
    evidenceTitle: "Artifact boundary",
    code: `included:
  - attention score formula
  - masking rule
  - residual path note

excluded:
  - training recipe
  - optimizer claims`,
    pills: ["cited", "bounded", "not a summary"],
    workTitle: "What breaks first?",
    question: "Si removemos la mascara causal, que afirmacion del articulo deja de ser verdadera?",
    answer: "Tu respuesta todavia no prueba el boundary. Sibar pide evidencia antes de darte la explicacion completa.",
    resultTitle: "No aprobado todavia",
    readiness: 42,
    result: "Gap detectado: confundis mecanismo local con garantia global. La reparacion es escribir un contraejemplo pequeno.",
    repairs: [
      "Marcar la linea que justifica causal masking.",
      "Escribir un input donde mirar el futuro rompe la prediccion.",
      "Reintentar con una respuesta de 4 frases."
    ]
  },
  question: {
    evidenceTitle: "Evidence slice",
    code: `source slice:
  attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V

claim under test:
  decoder tokens cannot attend to future positions`,
    pills: ["line cited", "claim under test", "counterexample ready"],
    workTitle: "Ownership check",
    question: "Explicalo sin usar la palabra 'contexto': por que la mascara cambia lo que el modelo puede saber?",
    answer: "Respuesta rapida: 'porque mira solo lo anterior'. Falta conectar esa frase con la matriz de atencion.",
    resultTitle: "Gap activo",
    readiness: 54,
    result: "Sibar no desbloquea la explicacion larga hasta que aparezca el mecanismo. La pregunta fuerza una prueba corta.",
    repairs: [
      "Nombrar QK^T como matriz de compatibilidad.",
      "Mostrar donde la mascara vuelve imposible una conexion.",
      "Separar 'orden' de 'informacion disponible'."
    ]
  },
  readiness: {
    evidenceTitle: "Re-evaluation trace",
    code: `attempt:
  "masking zeroes future attention scores before softmax"

evidence:
  - cites formula
  - cites future-token constraint

verdict:
  bounded readiness for causal masking`,
    pills: ["reevaluated", "evidence-backed", "next node unlocked"],
    workTitle: "Repair accepted",
    question: "Ahora si: que cambio minimo haria que el decoder deje de ser autoregresivo?",
    answer: "Respuesta con evidencia: si permito scores hacia posiciones futuras antes del softmax, cada token puede condicionar su salida en informacion que no deberia existir.",
    resultTitle: "Ready: bounded",
    readiness: 86,
    result: "Readiness acotado: podes explicar causal masking y detectar una violacion simple. No implica dominar transformers completos.",
    repairs: [
      "Siguiente nodo: cross-attention.",
      "Mantener boundary: no saltar a training dynamics.",
      "Guardar esta evidencia como memoria de misconception resuelta."
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
