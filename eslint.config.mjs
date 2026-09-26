import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Agent-tool skill mirrors kept in the repo. Each holds its own copy of the
    // same skill plus a bundled screenshot script, so linting them reported the
    // same findings six times over and buried the app's own results.
    ".agent/**",
    ".agents/**",
    ".cursor/**",
    ".gemini/**",
    ".opencode/**",
    ".qoder/**",
  ]),
]);

export default eslintConfig;
