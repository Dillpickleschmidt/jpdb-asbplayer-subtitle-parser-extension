//@ts-check

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import tailwindCSS from "eslint-plugin-tailwindcss";
import prettier from "eslint-config-prettier";
import solid from "eslint-plugin-solid/configs/typescript.js";
import * as tsParser from "@typescript-eslint/parser";

export default tseslint.config(
  ...tailwindCSS.configs["flat/recommended"],
  eslint.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  prettier,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
      },
    },
    rules: {
      indent: ["error", 2],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es5,
        chrome: "readonly",
      },
    },
  },
  {
    ignores: ["watch.js", "dist/**", "coverage/**"],
  }
);
