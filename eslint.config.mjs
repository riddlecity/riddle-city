import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript"
  ),
  {
    rules: {
      "no-unused-vars": "off", // Using TypeScript's rule instead
      "no-console": "off", // Temporarily disabled for development
      "@typescript-eslint/explicit-function-return-type": "off", // Temporarily disabled
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off", // Temporarily disabled
      "react/jsx-no-comment-textnodes": "error"
    }
  }
];

export default eslintConfig;
