import db from "@astrojs/db";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import type { SessionDriverConfig } from "astro";
import { defineConfig, sessionDrivers } from "astro/config";

let driver: SessionDriverConfig;

if (process.env.NODE_ENV === "production") {
  const createDatabase = await import("db0").then((mod) => mod.createDatabase);
  const libsql = await import("db0/connectors/libsql/web").then(
    (mod) => mod.default,
  );

  const db = createDatabase(
    libsql({
      url: process.env.ASTRO_DB_REMOTE_URL || ":memory:",
      ...(process.env.ASTRO_DB_APP_TOKEN
        ? { authToken: process.env.ASTRO_DB_APP_TOKEN }
        : {}),
    }),
  );

  driver = sessionDrivers.db0({
    database: db,
    tableName: "sessions",
  });
} else {
  driver = sessionDrivers.fsLite({
    base: ".astro/sessions-kv",
  });
}

// https://astro.build/config
export default defineConfig({
  integrations: [react(), db(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://todo-astro.vercel.app",
  output: "server",
  adapter: vercel({
    isr: {
      exclude: [/^\/api\//],
    },
  }),
  session: { driver },
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
});
