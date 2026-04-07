import { actions } from "astro:actions";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import { useMemo, useRef, useState } from "react";
import { queryClient } from "@/query_client";

export type TodoItem = {
  id: number;
  title: string;
  completed?: boolean;
  ghost?: boolean; // flag for any optimistic state
  tempId?: number; // for optimistic additions
  [key: string]: unknown; // for optimistic flags
};

export default function Todo({
  todos,
}: {
  todos: { id: number; title: string; completed: boolean }[];
}) {
  const [newTodo, setNewTodo] = useState("");

  const { data, isFetching } = useQuery(
    {
      queryKey: ["todos"],
      queryFn: actions.getTodos.orThrow,
      initialData: todos as TodoItem[],
      staleTime: 5 * 60 * 1000, // 5 min
    },
    queryClient,
  );

  const addTodo = useMutation(
    {
      mutationFn: actions.addTodo.orThrow,
      async onMutate(input) {
        await queryClient.cancelQueries({ queryKey: ["todos"] });

        // optimistically add the new todo to the list with a temporary id
        const tempId =
          Math.max(0, ...data.map((t) => t.id ?? t.tempId)) + 1;

        const newTodoItem = {
          tempId,
          title: input.title,
          completed: false,
          ghostAdd: true,
          ghost: true,
        };

        const previousTodoList = data;

        queryClient.setQueryData(["todos"], [...data, newTodoItem]);

        return { previousTodoList, optimisticItem: newTodoItem };
      },
      onSuccess: (result, _, onMutateResult) => {
        const ghost = onMutateResult.optimisticItem;

        const newItem = {
          id: result.id,
          title: ghost.title,
          completed: ghost.completed,
          ...(ghost.tempId === result.id
            ? {}
            : {
                tempId: ghost.tempId,
              }),
        };

        queryClient.setQueryData(["todos"], (old: TodoItem[]) =>
          old
            ? old.map((t) => (t.tempId === ghost.tempId ? newItem : t))
            : [newItem],
        );
      },
      onError: (error, _, onMutateResult) => {
        console.error("Failed to add todo:", error);
        const ghost = onMutateResult?.optimisticItem;

        if (ghost) {
          queryClient.setQueryData(["todos"], onMutateResult.previousTodoList);
        }

        queryClient.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const modifyTodo = useMutation(
    {
      mutationFn: actions.changeTodo.orThrow,
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: ["todos"] });

        const { id, title } = input;

        const previousList = data;

        queryClient.setQueryData(
          ["todos"],
          data.map((t) =>
            t.id === id ? { ...t, title, ghostMod: true, ghost: true } : t,
          ),
        );

        return { previousList, modifiedId: id };
      },
      onSuccess: async (_1, _2, onMutateResult) => {
        const id = onMutateResult.modifiedId;

        queryClient.setQueryData(
          ["todos"],
          data.map((t) =>
            t.id === id
              ? {
                  title: t.title,
                  id: t.id,
                  completed: t.completed,
                }
              : t,
          ),
        );
      },
      onError: (error, _, onMutateResult) => {
        console.error("Failed to modify todo:", error);

        if (onMutateResult) {
          queryClient.setQueryData(["todos"], onMutateResult.previousList);
        }

        queryClient.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const toggleTodo = useMutation(
    {
      mutationKey: ["toggleTodo"],
      mutationFn: actions.toggleTodo.orThrow,
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: ["todos"] });
        const id = input.id;

        const previousList = data;

        queryClient.setQueryData(
          ["todos"],
          data.map((t) =>
            t.id === id
              ? { ...t, completed: !t.completed, ghostCheck: true, ghost: true }
              : t,
          ),
        );

        return { previousList, toggledId: id };
      },
      onSuccess: async (_1, _2, onMutateResult) => {
        const id = onMutateResult.toggledId;

        queryClient.setQueryData(
          ["todos"],
          data.map((t) =>
            t.id === id
              ? {
                  title: t.title,
                  id: t.id,
                  completed: t.completed,
                }
              : t,
          ),
        );
      },
      onError: (error, _, onMutateResult) => {
        if (onMutateResult) {
          queryClient.setQueryData(["todos"], onMutateResult.previousList);
        }

        console.error("Failed to toggle todo:", error);
        queryClient.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const deleteTodo = useMutation(
    {
      mutationFn: actions.deleteTodo.orThrow,
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: ["todos"] });

        const id = input.id;

        const previousList = data;

        queryClient.setQueryData(
          ["todos"],
          data.map((t) =>
            t.id === id ? { ...t, ghostDel: true, ghost: true } : t,
          ),
        );

        return { previousList, deletedId: id };
      },
      onSuccess: () => {
        const id = deleteTodo.variables?.id;

        queryClient.setQueryData(
          ["todos"],
          data.filter((t) => t.id !== id),
        );
      },
      onError: (error, _, onMutateResult) => {
        console.error("Failed to delete todo:", error);

        if (onMutateResult) {
          queryClient.setQueryData(["todos"], onMutateResult.previousList);
        }

        queryClient.invalidateQueries({ queryKey: ["todos"] });
      },
    },
    queryClient,
  );

  const isSyncing =
    isFetching || addTodo.isPending || toggleTodo.isPending;

  const debouncedModify = useRef(
    debounce(({ id, title }) => {
      modifyTodo.mutate({ id, title });
    }, 500),
  ).current;

  const todoList = useMemo(
    () =>
      data.sort((a, b) => {
        if (a.completed === b.completed) {
          return (a.tempId ?? a.id) - (b.tempId ?? b.id);
        }

        return a.completed ? 1 : -1;
      }),
    [data],
  );

  const [animation] = useAutoAnimate();

  return (
    <div className="">
      <div className="mb-2 flex flex-row justify-between">
        <h1 className="text-2xl">Todo List</h1>
        <button
          type="button"
          disabled={isSyncing}
          className="cursor-pointer rounded border border-gray-300 bg-gray-100 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["todos"] })}
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          newTodo.trim() && addTodo.mutate({ title: newTodo.trim() });
          setNewTodo("");
        }}
      >
        <input
          type="text"
          onChange={(e) => setNewTodo(e.target.value)}
          value={newTodo}
          className="mb-5 rounded border border-gray-300"
        />
        <button
          type="submit"
          className="ml-1 cursor-pointer rounded border border-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add a new Todo
        </button>
      </form>

      <ul
        className={`flex flex-col gap-2 ${isFetching ? "opacity-50" : ""}`}
        ref={animation}
      >
        {todoList.map((item) => (
          <li
            key={item.tempId ?? item.id}
            className={`flex flex-row gap-1 ${item.ghostAdd ? "opacity-50" : ""} ${item.ghostDel ? "line-through opacity-30" : ""}`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleTodo.mutate({ id: item.id })}
              disabled={item.ghost}
              className={`cursor-pointer rounded border-gray-300 disabled:cursor-not-allowed ${item.ghostCheck ? "opacity-50" : ""}`}
            />

            <button
              type="button"
              disabled={item.ghost}
              className={`cursor-pointer rounded border border-gray-300 px-1 disabled:cursor-not-allowed ${item.completed ? "font-bold text-gray-700" : "text-gray-500"}`}
              onClick={() => deleteTodo.mutate({ id: item.id })}
            >
              D
            </button>

            <input
              type="text"
              name="title"
              defaultValue={item.title}
              disabled={!!item.ghostDel || !!item.ghostAdd}
              className={`${item.ghostMod ? "opacity-50" : ""}`}
              onChange={(e) => {
                e.preventDefault();
                queryClient.setQueryData(["todos"], (old: typeof todoList) =>
                  old.map((t) =>
                    t.id === item.id ? { ...t, title: e.target.value } : t,
                  ),
                );
                debouncedModify({ id: item.id, title: e.target.value });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
