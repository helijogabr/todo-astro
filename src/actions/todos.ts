import { ActionError, defineAction } from "astro:actions";
import { and, asc, db, desc, eq, not, Todo } from "astro:db";
import { z } from "astro/zod";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getTodos = defineAction({
  handler: async (_, { session }) => {
    const user = await session?.get("userId");

    if (import.meta.env.DEV) {
      await sleep(500);
    }

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view todos",
      });
    }

    const todos = await db
      .select({
        id: Todo.id,
        title: Todo.title,
        completed: Todo.completed,
      })
      .from(Todo)
      .where(eq(Todo.user, user))
      .orderBy(asc(Todo.completed), desc(Todo.id));

    return todos;
  },
});

export const addTodo = defineAction({
  input: z.object({
    title: z.string().trim(),
    completed: z.boolean().optional(),
  }),
  handler: async (input, { session }) => {
    if (import.meta.env.DEV) {
      await sleep(1000);
    }

    const { title, completed } = input;
    const user = await session?.get("userId");

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to add a todo",
      });
    }

    const result = await db.insert(Todo).values({ title, user, completed });

    if (!result.lastInsertRowid) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add todo",
      });
    }

    return { success: true, id: Number(result.lastInsertRowid) };
  },
});

export const toggleTodo = defineAction({
  input: z.object({
    id: z.number(),
  }),
  handler: async (input, { session }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const { id } = input;
    const user = await session?.get("userId");

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to toggle a todo",
      });
    }

    const todo = await db
      .select({
        user: Todo.user,
      })
      .from(Todo)
      .where(and(eq(Todo.id, id)))
      .then((rows) => rows[0]);

    if (!todo) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    }

    if (todo.user !== user) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "You cannot toggle a todo that is not yours",
      });
    }

    const res = await db
      .update(Todo)
      .set({ completed: not(Todo.completed) })
      .where(and(eq(Todo.id, id), eq(Todo.user, user)));

    return { success: res.rowsAffected === 1 };
  },
});

export const changeTodo = defineAction({
  input: z.object({
    id: z.number(),
    title: z.string().trim().optional(),
    completed: z.boolean().optional(),
  }),
  handler: async (input, { session }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const { id, title, completed } = input;
    const user = await session?.get("userId");

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to delete a todo",
      });
    }

    const todo = await db
      .select({
        user: Todo.user,
      })
      .from(Todo)
      .where(and(eq(Todo.id, id)))
      .then((rows) => rows[0]);

    if (!todo) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    }

    if (todo.user !== user) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "You cannot delete a todo that is not yours",
      });
    }

    const res = await db
      .update(Todo)
      .set({ title, completed })
      .where(and(eq(Todo.id, id), eq(Todo.user, user)));

    return { success: res.rowsAffected === 1 };
  },
});

export const deleteTodo = defineAction({
  input: z.object({
    id: z.number(),
  }),
  handler: async (input, { session }) => {
    if (import.meta.env.DEV) {
      await sleep(500);
    }

    const { id } = input;
    const user = await session?.get("userId");

    if (!user) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to delete a todo",
      });
    }

    const todo = await db
      .select({
        user: Todo.user,
      })
      .from(Todo)
      .where(and(eq(Todo.id, id)))
      .then((rows) => rows[0]);

    if (!todo) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    }

    if (todo.user !== user) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "You cannot delete a todo that is not yours",
      });
    }

    await db.delete(Todo).where(eq(Todo.id, id));

    return { success: true };
  },
});
