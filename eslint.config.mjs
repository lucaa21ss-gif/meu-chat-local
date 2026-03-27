import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "apps/web/output.css",
      "**/package-lock.json",
      "coverage/**",
      ".github/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["apps/api/**/*.js", "modules/**/*.js", "platform/**/*.js", "shared/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["apps/web/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["warn", { vars: "all", args: "none", ignoreRestSiblings: true }],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
        fetch: "readonly",
        AbortController: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
