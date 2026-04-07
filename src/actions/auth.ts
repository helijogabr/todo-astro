import { ActionError, defineAction } from "astro:actions";
import { db, eq, User } from "astro:db";
import { z } from "astro/zod";

import bcrypt from "bcrypt";

export const createUserForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase(),
    password: z.string().trim().toLowerCase(),
  }),
  handler: async (input, { session }) => {
    const { username, password } = input;

    const existingUser = await db
      .select()
      .from(User)
      .where(eq(User.name, username))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingUser) {
      throw new ActionError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db
      .insert(User)
      .values({ name: username, password: hashed });

    if (!result.lastInsertRowid) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user",
      });
    }

    session?.set("userId", Number(result.lastInsertRowid));

    return { success: true };
  },
});

export const loginForm = defineAction({
  accept: "form",
  input: z.object({
    username: z.string().trim().toLowerCase(),
    password: z.string().trim().toLowerCase(),
  }),
  handler: async (input, { session, url }) => {
    const { username, password } = input;

    if (!session) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Session is not available",
      });
    }

    const user = await db
      .select({
        id: User.id,
        name: User.name,
        password: User.password
      })
      .from(User)
      .where(eq(User.name, username))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      const hashed = await bcrypt.hash(password, 10);

      const result = await db
        .insert(User)
        .values({ name: username, password: hashed });

      if (!result.lastInsertRowid) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      session?.destroy();
      session?.set("userId", Number(result.lastInsertRowid), {
        ttl: 1000 * 60 * 60 * 24, // 1 day
      });

      return {
        success: true,
        redirect: url.searchParams.get("return") || undefined,
      };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "Invalid password",
      });
    }

    session?.destroy();
    session?.set("userId", user.id, {
      ttl: 1000 * 60 * 60 * 24, // 1 day
    });

    return {
      success: true,
      redirect: url.searchParams.get("return") || undefined,
    };
  },
});

export const logout = defineAction({
  handler: async (_input, { session }) => {
    session?.destroy();
    return { success: (await session?.get("userId")) === undefined };
  },
});
