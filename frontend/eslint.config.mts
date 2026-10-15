import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const layers = (patterns: string[], message: string) =>
  ["error", { patterns: [{ group: patterns, message }] }] as const;

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["src/business/**/*.ts"],
    rules: {
      "no-restricted-imports": layers(
        [
          "@/ui/**",
          "@/api/**",
          "@/mocks/**",
          "@/app/**",
          "react",
          "next",
          "next/**",
          "axios",
          "axios/**",
          "**/api/**",
          "**/ui/**",
          "**/mocks/**",
        ],
        "Negocio solo depende de sus entidades, reglas y contratos.",
      ),
      "no-restricted-globals": [
        "error",
        "fetch",
        "window",
        "document",
        "localStorage",
        "sessionStorage",
      ],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": layers(
        ["@/api/**", "@/mocks/**", "@/app/**", "**/api/**", "**/mocks/**", "axios", "axios/**"],
        "La UI recibe los casos de uso por inyección; no accede a APIs ni mocks.",
      ),
      "no-restricted-globals": ["error", "fetch", "XMLHttpRequest"],
    },
  },
  {
    files: ["src/{api,mocks}/**/*.ts"],
    rules: {
      "no-restricted-imports": layers(
        ["@/ui/**", "@/app/**", "react", "next", "next/**"],
        "Los adaptadores no dependen de presentación ni de Next.js.",
      ),
    },
  },
]);
