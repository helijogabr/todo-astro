import db from "@astrojs/db";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), db()],
  vite: {
    plugins: [tailwindcss()],
  },
  output: "static",
  adapter: vercel(),
});
