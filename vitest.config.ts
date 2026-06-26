import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: process.cwd(), // überschreibt root:"./assets" aus viteConfig, damit WAT4/ gefunden wird
    test: {
      environment: "happy-dom",
      include: [
        "assets/**/*.{test,spec}.{js,ts}",
        "WAT4/moser/unit-tests/**/*.{test,spec}.{js,ts}",
      ],
    },
  })
);
