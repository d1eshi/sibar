import * as React from "react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

const initialTodos: Todo[] = [
  { id: 1, title: "Crear inventario de demo", completed: true },
  { id: 2, title: "Abrir workbench contra sourceRoot local", completed: false },
];

export default function App(): React.ReactElement {
  const [todos, setTodos] = React.useState<Todo[]>(initialTodos);
  const [title, setTitle] = React.useState("");
  const [nextId, setNextId] = React.useState(initialTodos.length + 1);

  const completedCount = todos.filter((todo) => todo.completed).length;

  const addTodo = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (nextTitle === "") return;
    setTodos((previous) => [...previous, { id: nextId, title: nextTitle, completed: false }]);
    setNextId((previous) => previous + 1);
    setTitle("");
  };

  const toggleTodo = (id: number): void => {
    setTodos((previous) =>
      previous.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 620, margin: "0 auto" }}>
      <h1>Todo Demo (React + FastAPI)</h1>
      <p>Frontend de ejemplo para un caso mixto de inventario y señales de evidencia.</p>

      <form onSubmit={addTodo} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr auto" }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Agregar tarea"
          style={{ padding: 8 }}
        />
        <button type="submit">Agregar</button>
      </form>

      <p>
        {completedCount} de {todos.length} tareas completadas
      </p>
      <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {todos.map((todo) => (
          <li key={todo.id} style={{ display: "grid", gridTemplateColumns: "20px auto", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => {
                toggleTodo(todo.id);
              }}
            />
            <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>{todo.title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
