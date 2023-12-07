import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import del from "rollup-plugin-delete";
import copy from "rollup-plugin-copy";

const config = {
  input: "src/index.js",
  output: {
    file: "dist/index.js",
    sourcemap: true,
  },
  plugins: [
    del({ targets: "dist/*" }),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    babel({ exclude: "node_modules/**", babelHelpers: "runtime" }),
    terser(),
    copy({
      targets: [
        {
          src: "package.json",
          dest: "dist",
        },
      ],
    }),
  ],
  external: [/@babel\/runtime/, /node_modules/],
};

export default config;
