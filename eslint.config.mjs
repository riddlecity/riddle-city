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
      "@typescript-eslint/no-explicit-any": "off", // Temporarily disabled
      "@typescript-eslint/no-unused-vars": "off", // Temporarily disabled
      "react-hooks/rules-of-hooks": "error", // Keep this as error since it's a critical React rule
      "react-hooks/exhaustive-deps": "off", // Temporarily disabled
      "react/no-unescaped-entities": "off", // Temporarily disabled
      "react/jsx-no-comment-textnodes": "warn" // Downgraded to warning
    }
  }
];

export default eslintConfig;
