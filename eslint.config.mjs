import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import docusaurusPlugin from "@docusaurus/eslint-plugin";

export default [
  {
    ignores: [
      "build/**",
      "node_modules/**",
      ".docusaurus/**",
      "static/data/*.json",
      "static/feeds/*.json",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@docusaurus": docusaurusPlugin,
    },
    rules: {
      // Recommended rules from @typescript-eslint/eslint-plugin
      ...tsPlugin.configs.recommended.rules,
      // Recommended rules from @docusaurus/eslint-plugin
      ...docusaurusPlugin.configs.recommended.rules,

      "@docusaurus/string-literal-i18n-messages": "warn",
      "@docusaurus/no-untranslated-text": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }]
    },
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
];
