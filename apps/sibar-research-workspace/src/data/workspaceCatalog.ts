import type {
  WorkspaceHomeProjection,
  WorkspaceSessionFixture,
} from "../state/workspaceProjection";

export const defaultStudyCourseTitle =
  "Curso de Estadística y Probabilidad - Platzi";

export const workspaceHomeProjection: WorkspaceHomeProjection = {
  workspaces: [
    {
      id: "estadistica-platzi",
      title: defaultStudyCourseTitle,
      objective: "Tomar notas de la clase y consolidar conceptos del curso.",
      sourceBoundary: "Apuntes de clase",
      progress: "Clase 8",
      nextNode: "Clase 8, notas",
      readinessHint: "Sesion de notas lista para continuar.",
      readinessPercent: 78,
      readinessLevel: "Good",
      lastActivity: "Today, 10:24 AM",
      icon: "document",
      status: "active",
      openTarget: "session",
    },
  ],
};

export const firstWorkspaceSessionFixture: WorkspaceSessionFixture = {
  title: defaultStudyCourseTitle,
  sessionHint:
    "Tomar notas de la clase actual y guardar entradas locales de estudio.",
  nodes: [
    {
      id: "clase-8",
      name: "Clase 8",
      scope: "Notas de Estadistica y Probabilidad para la clase actual.",
      sessionTitle: "Clase 8",
      status: "ready",
      miniNodes: [
        {
          id: "mn-apuntes",
          name: "Notas",
          question: "Escribir los conceptos, formulas y dudas de esta clase.",
          sourceId: "source-class-note",
        },
      ],
    },
  ],
  sources: [
    {
      id: "source-class-note",
      type: "note",
      title: "Clase 8, notas",
      metadata: defaultStudyCourseTitle,
      snippet:
        "Cuaderno de apuntes para conceptos, formulas, ejemplos y dudas de la clase.",
      body: [
        "Usa esta pagina para capturar los conceptos principales de la clase, ejemplos resueltos, formulas importantes y preguntas pendientes.",
        "Las fuentes y artefactos de investigacion siguen disponibles como un panel opcional para otros tipos de workspace.",
      ],
    },
  ],
};
