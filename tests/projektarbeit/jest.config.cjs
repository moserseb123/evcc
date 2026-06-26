/**
 * Isolierte Jest-Konfiguration fuer die Projektarbeit.
 *
 * Aufruf:  npx jest -c tests/projektarbeit/jest.config.cjs
 */
const path = require("path");
const root = path.resolve(__dirname, "../..");

/** @type {import('jest').Config} */
module.exports = {
  rootDir: root,
  roots: ["<rootDir>/tests/projektarbeit"],
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
