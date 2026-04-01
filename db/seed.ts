import { db, Todo, User } from "astro:db";

import bcrypt from "bcrypt";

// https://astro.build/db/seed
export default async function seed() {
  await db
    .insert(User)
    .values({ name: "Alice", id: 1, password: await bcrypt.hash("123", 10) });

  await db
    .insert(User)
    .values({ name: "Bob", id: 2, password: await bcrypt.hash("456", 10) });

  await db.insert(Todo).values({
    title: "Buy groceries",
    user: 1,
  });

  await db.insert(Todo).values({
    title: "Walk the dog",
    user: 2,
  });
}
