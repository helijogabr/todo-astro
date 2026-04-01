import { column, defineDb, defineTable } from "astro:db";

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({
      unique: true
    }),
    password: column.text()
  },
});

const Todo = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    completed: column.boolean({ default: false }),
    user: column.number({
      references: () => User.columns.id,
    }),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { User, Todo },
});
