import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*.css", "**/*.css"],
              message: "Import the app/globals.css layer entry only from app/layout.tsx.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Inline UI styles are forbidden. Add a semantic class to app/globals.css.",
        },
      ],
    },
  },
  {
    files: ["app/layout.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["app/apple-icon.tsx", "app/opengraph-image.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
