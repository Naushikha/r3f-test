// vite-plugin-worker-loader.ts
import { Plugin } from "vite";
import { createFilter } from "@rollup/pluginutils";

export function workerLoader(): Plugin {
  const filter = createFilter(["**/*.worker.js"]);

  return {
    name: "worker-loader",
    transform(src, id) {
      if (!filter(id)) return null;

      // Return the code for creating a worker from the script
      return {
        code: `export default new Worker(new URL(${JSON.stringify(
          id
        )}, import.meta.url), { type: 'module' });`,
        map: null, // Disable sourcemaps for this transformation
      };
    },
  };
}
