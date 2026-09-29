import {FlatCompat} from "@eslint/eslintrc";
import {fileURLToPath} from "node:url";
import path from "node:path";
import nextVitals from "eslint-config-next/core-web-vitals.js";

const compat=new FlatCompat({
  baseDirectory:path.dirname(fileURLToPath(import.meta.url))
});

const config=[
  ...compat.config(nextVitals),
  {
    ignores:[".next/**","node_modules/**"]
  }
];

export default config;
