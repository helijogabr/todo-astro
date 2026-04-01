import { actions } from "astro:actions";
import { useState } from "react";

export default function Todo({
  todos,
}: {
  todos: { id: number; title: string; completed: boolean }[];
}) {
  const [todoList, setTodoList] = useState(todos);
  const [newTodo, setNewTodo] = useState("");

  async function addTodo(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newTodo.trim() === "") return;

    const res = await actions.addTodo({
      title: newTodo,
    });

    if (res.error) {
      console.error("Failed to add todo:", res.error);
      return;
    }

    const newTodoItem = {
      id: res.data.id,
      title: newTodo,
      completed: false,
    };

    setTodoList([...todoList, newTodoItem]);
    setNewTodo("");
  }

  async function toggleTodo(index: number) {
    if (!todoList[index]) return;
    const id = todoList[index].id;

    const res = await actions.toggleTodo({ id });

    if (res.error) {
      console.error("Failed to toggle todo:", res.error);
      return;
    }

    todoList[index].completed = !todoList[index].completed;
    setTodoList([...todoList]);
  }

  async function deleteTodo(index: number) {
    if (!todoList[index]) return;

    const id = todoList[index].id;

    const res = await actions.deleteTodo({ id });

    if (res.error) {
      console.error("Failed to delete todo:", res.error);
      return;
    }

    setTodoList(todoList.filter((_, i) => i !== index));
  }

  return (
    <div className="">
      <h1 className="text-2xl">Todo List</h1>

      <form onSubmit={addTodo}>
        <input
          type="text"
          onChange={(e) => setNewTodo(e.target.value)}
          value={newTodo}
          className="rounded border border-gray-300 mb-5"
        />
        <button type="submit" className="ml-1 rounded border border-gray-300">
          Add a new Todo
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {todoList.map((item, index) => (
          <li key={item.id} className="flex flex-row gap-1">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleTodo(index)}
            />

            <button
              type="button"
              disabled={!item.completed}
              className={
                "rounded border border-gray-300 px-1 " +
                (item.completed ? "font-bold text-gray-700" : "text-gray-500")
              }
              onClick={() => deleteTodo(index)}
            >
              D
            </button>

            <span>{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
