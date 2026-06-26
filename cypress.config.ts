import { defineConfig } from "cypress";
import { devServer as viteDevServer } from "@cypress/vite-dev-server";
import { fileURLToPath } from "url";
import path from "path";
import vuePlugin from "@vitejs/plugin-vue";

// ESM-kompatibler Ersatz für __dirname
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const viteConfig = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./assets/js"),
    },
  },
  plugins: [
    vuePlugin({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("shopicon-"),
        },
      },
    }),
  ],
};

/**
 * Cypress Component Testing Konfiguration
 */
export default defineConfig({
  env: {
    // npm run test:cypress:open:slow startet mit CYPRESS_slowMode=1 für Demo-Tempo
    slowMode: false,
  },
  component: {
    devServer(cypressDevServerConfig) {
      return viteDevServer({
        ...cypressDevServerConfig,
        framework: "vue",
        viteConfig,
      });
    },
    specPattern: [
      "WAT4/integration-tests/component/**/*.cy.{ts,tsx,js}",
      "WAT4/kalt/integration-tests/component/**/*.cy.{ts,tsx,js}",
    ],
    supportFile: "WAT4/integration-tests/cypress-support/component.ts",
    indexHtmlFile: "WAT4/integration-tests/cypress-support/component-index.html",
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
