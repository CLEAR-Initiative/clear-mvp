import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // Agent worktrees nest full checkouts under .claude/worktrees.
      ".claude/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "next-env.d.ts",
      // Run inside clear-api's image against its Prisma client, not this app.
      "e2e/support/*-seed.ts",
      // Standalone spike CLI (`npm run logie:spike`), not part of the app build.
      "scripts/logie/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // `_`-prefixed names and rest-sibling omits (`const { a: _, ...rest }`) are
      // deliberate discards, not dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
