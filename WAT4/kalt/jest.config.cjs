/**
 * Isolierte Jest-Konfiguration fuer die Projektarbeit.
 * Laeuft NUR ueber Dateien in diesem Ordner (*.jest.ts), damit die
 * vorhandenen Vitest- (*.test.ts) und Playwright-Specs (*.spec.ts)
 * nicht erfasst werden.
 *
 * Aufruf:  npx jest -c tests/projektarbeit/jest.config.cjs
 */
const path = require("path");
const root = path.resolve(__dirname, "../..");

/** @type {import('jest').Config} */
module.exports = {
  rootDir: root,
  roots: [__dirname],
  testMatch: ["**/*.jest.ts"],
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: path.join(__dirname, "tsconfig.jest.json") },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/assets/js/$1",
  },
  clearMocks: true,
};
