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
  {
    // A paint value that reads feature-state must keep reading it, or Mapbox
    // can crash its render loop (GlitchTip prod #912). `setPaintPropertySafe`
    // checks that; a direct call skips the check.
    files: ["src/components/map/**", "src/lib/map/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='setPaintProperty']",
          message: "Use setPaintPropertySafe from ~/lib/map/safe-paint, which checks the feature-state rule.",
        },
      ],
    },
  },
  {
    files: ["src/containers/map/**"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/containers/map",
              from: ["./src/components/map", "./src/lib/map", "./src/app/(app)/map"],
              message: "Map v2 is built in isolation from the old map.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
