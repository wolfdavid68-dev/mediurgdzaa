// ESLint 9 flat config — lint + a11y + TypeScript pour MediURG.
// Activé via `npm run lint`. Désactivé sur build/, node_modules/, scripts/.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactCompiler from "eslint-plugin-react-compiler";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["build/**", "node_modules/**", "scripts/**", "*.config.js", "*.config.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-compiler": reactCompiler,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: { version: "19.0" },
    },
    rules: {
      // React 17+ : plus besoin d'importer React pour utiliser JSX
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
      // Hooks — règles essentielles
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler : signale les patterns que le compiler ne peut pas
      // optimiser (mutations directes, state sans setter, etc.).
      "react-compiler/react-compiler": "warn",
      // A11y
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      // Hygiène
      "no-unused-vars": "off", // remplacé par la version TS
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Migration TS « loose pragmatique » : on autorise temporairement les any
      // et les @ts-ignore. Tightening progressif dans les versions suivantes.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    files: ["src/**/*.test.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
      },
    },
  },
  // Désactive les règles ESLint qui entrent en conflit avec Prettier (toujours en dernier)
  prettier,
];
