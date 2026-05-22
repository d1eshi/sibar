import type {
  OwnershipSessionAdvance,
  OwnershipSessionGapReason,
  OwnershipSessionObservation,
  OwnershipSessionQuestion,
  OwnershipSessionState,
  ReviewQueueItem,
} from "./types";

export function makeOwnershipSessionQuestions(reviewQueue: ReviewQueueItem[]): OwnershipSessionQuestion[] {
  return reviewQueue.map((item) => {
    if (item.filePath.endsWith("session.test.ts")) {
      return {
        id: item.id,
        filePath: item.filePath,
        title: item.boundaryTitle,
        prompt:
          "Conectá `src/api/session.test.ts` con `src/api/session.ts`: qué contrato prueba el test y qué caller queda sin probar?",
        intent: "Connect the regression test to the changed null-return API contract and name the missing caller evidence.",
        hintLadder: [
          "El test observa `toBeNull()`.",
          "Eso cubre la rama 204 de `createSession`.",
          "Todavía falta probar qué hace un caller cuando recibe `null`.",
        ],
      };
    }

    if (item.filePath.endsWith("consumer.ts")) {
      return {
        id: item.id,
        filePath: item.filePath,
        title: item.boundaryTitle,
        prompt:
          "Ahora conectá `src/runtime/consumer.ts` con `src/api/session.ts`: qué debe hacer el caller cuando `createSession` devuelve `null`?",
        intent: "Trace the caller branch required by the null-return session boundary.",
        hintLadder: [
          "Buscá la rama falsy de `session`.",
          "`null` significa que no hay sesión autenticada.",
          "La relación esperada es API contract -> caller branch -> no privileged request.",
        ],
      };
    }

    return {
      id: item.id,
      filePath: item.filePath,
      title: item.boundaryTitle,
      prompt: `Repasá \`${item.filePath}\`: qué entendés que cambió acá?`,
      intent: "Identify the changed boundary before looking at callers or tests.",
      hintLadder: [
        "La rama nueva mira el status HTTP.",
        "`204` ya no intenta parsear JSON.",
        "La salida nueva posible es `null`, y eso cambia el contrato para callers.",
      ],
    };
  });
}

export function createOwnershipSessionState(): OwnershipSessionState {
  return {
    currentIndex: 0,
    isComplete: false,
    weakAttemptStreak: 0,
    observations: [],
    lastFeedback: null,
    showHintLadder: false,
  };
}

export function getCurrentOwnershipQuestion(
  state: OwnershipSessionState,
  questions: OwnershipSessionQuestion[],
): OwnershipSessionQuestion | null {
  if (state.isComplete) return null;
  return questions[state.currentIndex] ?? null;
}

export function advanceOwnershipSession(
  state: OwnershipSessionState,
  questions: OwnershipSessionQuestion[],
  attempt: string,
  action: "submit" | "mark_unknown",
): OwnershipSessionAdvance {
  const currentQuestion = getCurrentOwnershipQuestion(state, questions);
  const weakReason = classifyWeakAttempt(currentQuestion, attempt, action);

  if (!currentQuestion) {
    return {
      kind: "complete",
      state: { ...state, isComplete: true, lastFeedback: "Session complete.", showHintLadder: false },
      feedback: "Session complete.",
    };
  }

  if (weakReason == null) {
    if (isLastQuestion(state, questions)) {
      return {
        kind: "complete",
        state: {
          ...state,
          isComplete: true,
          weakAttemptStreak: 0,
          lastFeedback: "Ownership session complete. Final answer connected the required evidence.",
          showHintLadder: false,
        },
        feedback: "Ownership session complete. Final answer connected the required evidence.",
      };
    }

    return {
      kind: "advanced",
      state: {
        ...state,
        currentIndex: state.currentIndex + 1,
        weakAttemptStreak: 0,
        lastFeedback: "Respuesta aceptada. Sibi avanza al siguiente check.",
        showHintLadder: false,
      },
    };
  }

  const weakAttemptStreak = state.weakAttemptStreak + 1;
  const observation = makeObservation(currentQuestion, weakReason, state.observations.length + 1);
  const nextObservations = [...state.observations, observation];

  if (isLastQuestion(state, questions)) {
    return {
      kind: "complete",
      observation,
      state: {
        ...state,
        isComplete: true,
        weakAttemptStreak,
        observations: nextObservations,
        lastFeedback: `Gap final registrado: ${weakReason}. Sesión cerrada con observación pendiente.`,
        showHintLadder: false,
      },
      feedback: `Gap final registrado: ${weakReason}. Sesión cerrada con observación pendiente.`,
    };
  }

  return {
    kind: "advanced",
    observation,
    state: {
      ...state,
      currentIndex: state.currentIndex + 1,
      weakAttemptStreak,
      observations: nextObservations,
      lastFeedback: `Gap registrado: ${weakReason}. Sibi avanza al siguiente check.`,
      showHintLadder: weakAttemptStreak >= 2,
    },
  };
}

function isLastQuestion(state: OwnershipSessionState, questions: OwnershipSessionQuestion[]): boolean {
  return state.currentIndex >= questions.length - 1;
}

function classifyWeakAttempt(
  question: OwnershipSessionQuestion | null,
  attempt: string,
  action: "submit" | "mark_unknown",
): OwnershipSessionGapReason | null {
  if (action === "mark_unknown") return "no answer";

  const normalized = attempt.trim().toLowerCase();
  if (!normalized) return "no answer";
  if (normalized.length < 36) return "inconclusive";
  if (!question) return null;

  const isRelationQuestion =
    question.filePath.endsWith("session.test.ts") || question.filePath.endsWith("consumer.ts");
  if (!isRelationQuestion) {
    return normalized.includes("204") || normalized.includes("null") ? null : "inconclusive";
  }

  const connectsApi = normalized.includes("session.ts") || normalized.includes("createsession");
  const connectsNull = normalized.includes("null") || normalized.includes("204");
  const connectsCallerOrTest =
    normalized.includes("consumer") ||
    normalized.includes("caller") ||
    normalized.includes("test") ||
    normalized.includes("authenticated") ||
    normalized.includes("auth");

  return connectsApi && connectsNull && connectsCallerOrTest ? null : "could not connect caller/test";
}

function makeObservation(
  question: OwnershipSessionQuestion,
  reason: OwnershipSessionGapReason,
  count: number,
): OwnershipSessionObservation {
  return {
    id: `observation-${count}`,
    filePath: question.filePath,
    reason,
    note:
      reason === "no answer"
        ? "No answer before moving to the next ownership check."
        : reason === "inconclusive"
          ? "Attempt did not explain the changed boundary with enough evidence."
          : "Attempt did not connect the API change to its caller or regression test.",
  };
}
