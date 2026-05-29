from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional


class TodoItem(BaseModel):
    id: int
    title: str
    completed: bool = False


app = FastAPI()
_TODOS: List[TodoItem] = [
    TodoItem(id=1, title="Sincronizar inventario con sourceRoot", completed=True),
    TodoItem(id=2, title="Validar flujo React+FastAPI en Sibi", completed=False),
]


@app.get("/api/todos", response_model=List[TodoItem])
def list_todos() -> List[TodoItem]:
    return _TODOS


@app.post("/api/todos", response_model=TodoItem)
def create_todo(todo: TodoItem) -> TodoItem:
    next_id = max((item.id for item in _TODOS), default=0) + 1
    next_todo = TodoItem(id=next_id, **todo.model_dump(exclude={"id"}))
    _TODOS.append(next_todo)
    return next_todo


@app.put("/api/todos/{todo_id}", response_model=TodoItem)
def update_todo(todo_id: int, completed: bool) -> TodoItem:
    todo = next((item for item in _TODOS if item.id == todo_id), None)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.completed = completed
    return todo
