import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
// Configures Prettier with ESLint
import eslintConfigPrettier from "eslint-config-prettier";
import commentLength from "eslint-plugin-comment-length";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Configure the comment wrapping plugin for your files
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      "comment-length": commentLength,
    },
    rules: {
      "comment-length/limit-single-line-comments": [
        "warn",
        {
          maxLength: 100,
        },
      ],
    },
  },

  eslintConfigPrettier, // Placing this last to disable conflicting style rules between ESLint and Prettier
]);

export default eslintConfig;
