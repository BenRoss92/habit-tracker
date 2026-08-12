import type { Config } from "jest";
//  Imports Next.js's Jest adapter factory nextJest
// which helps create a Jest config aware of
// Next.js build/runtime
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  // Tells Jest to use the V8 code-coverage provider
  // (faster/smaller reports).
  coverageProvider: "v8",
  // Sets the test environment to jsdom so tests run
  // with a DOM-like environment
  // (required for React component tests).
  testEnvironment: "jsdom",
  // Instructs Jest to run jest.setup.ts after the
  // test framework is installed but before tests run
  // (used to register custom matchers/global setup).
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Maps the @/ import alias to src so tests resolve
  // the same path aliases as the app.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
