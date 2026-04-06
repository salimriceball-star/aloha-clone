import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const config = [
  {
    ignores: [
      ".browseros-profile/**",
      ".git/**",
      ".local/**",
      ".next/**",
      "docs/site-audit.generated.json",
      "logs/**",
      "memory/**",
      "next-env.d.ts",
      "node_modules/**",
      "out/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
