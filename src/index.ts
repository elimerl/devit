#!/usr/bin/env node
import open from "open";
import {
  createConfiguration,
  SnowpackConfig,
  SnowpackUserConfig,
  startServer,
} from "snowpack";
import { sync as glob } from "globby";
import jetpack from "fs-jetpack";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { program } from "commander";
import { basename, join, resolve } from "path";
import type { PackageJson } from "type-fest";
import { parse } from "node-html-parser";
const port = Number(process.env.PORT || 8080);
const userConf: SnowpackUserConfig = {
  mount: {
    ".": { url: "/" },
  },
  plugins: ["@snowpack/plugin-typescript"],
  routes: [],
  optimize: {},
  packageOptions: {
    source: "remote",
  },
  devOptions: { open: "none", output: "stream", port },
  buildOptions: {},
  exclude: ["node_modules"],
};
program
  .version("1.0.0")
  .command("start")
  .description("start the dev server")
  .action(() => {
    // can't disable snowpack "server started in" message, so using this
    const stdoutWrite = process.stdout.write;
    const log = [];
    process.stdout.write = (
      buf: string | Uint8Array,
      cb: ((error?: Error) => void) | string
    ) => {
      log.push(buf.toString());
      return true;
    };
    const config: SnowpackConfig = createConfiguration(userConf);
    startServer({ config, lockfile: null }).then((server) => {
      const msg = log
        .join("")
        .split("\n")
        .map((v) => stripAnsi(v))
        .find((v) => v.includes("started in"));
      const msStartup = Number(msg.slice(20, msg.indexOf("ms")));

      open("http://localhost:" + port);
      process.stdout.write = stdoutWrite;
      logIt(
        `devit started in ${msStartup}ms! URL: {cyan http://localhost:${port}}`
      );
    });
  });
program
  .command("create")
  .description("create snowpack config")
  .action(() => {
    logIt(`adding snowpack to devDependencies...`);
    const pkg: PackageJson =
      jetpack.read(resolve(process.cwd(), "package.json"), "json") || {};
    pkg.devDependencies = pkg.devDependencies
      ? {
          ...pkg.devDependencies,
          snowpack: "^3.0.11",
          "@snowpack/plugin-typescript": "^1.2.1",
        }
      : { snowpack: "^3.0.11", "@snowpack/plugin-typescript": "^1.2.1" };
    pkg.scripts = pkg.scripts
      ? { ...pkg.scripts, start: "snowpack dev", build: "snowpack build" }
      : { start: "snowpack dev", build: "snowpack build" };
    jetpack.write(resolve(process.cwd(), "package.json"), pkg);
    logIt("creating snowpack.config.js...");
    jetpack.write(
      resolve(process.cwd(), "snowpack.config.js"),
      `/** @type {import('snowpack').SnowpackUserConfig} */
module.exports = ${JSON.stringify(
        {
          ...userConf,
          devOptions: {},
          mount: {
            public: { url: "/", static: true },
            src: { url: "/dist" },
          },
        } as SnowpackUserConfig,
        null,
        4
      )}`
    );
    glob(["**/*.html", "!public/*.html"], { cwd: process.cwd() }).forEach(
      (filePath) => {
        jetpack.move(
          filePath,
          join(process.cwd(), "public", basename(filePath))
        );
        const root = parse(
          jetpack.read(join(process.cwd(), "public", basename(filePath)))
        );

        root.querySelectorAll("script").forEach((elem) => {
          elem.setAttribute(
            "src",
            "/" + pathJoin(["/dist/", elem.getAttribute("src")], "/")
          );
        });
        jetpack.write(
          join(process.cwd(), "public", basename(filePath)),
          root.outerHTML
        );
      }
    );
    glob(
      [
        "**/*.js",
        "**/*.mjs",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
        "!snowpack.config.js",
      ],
      {
        cwd: process.cwd(),
      }
    ).forEach((filePath) => {
      jetpack.move(filePath, join(process.cwd(), "src", basename(filePath)));
    });
    console.log();
    logIt(
      chalk`{bold Snowpack is setup! Run yarn install to get started, then run:}`
    );
    console.log();
    logIt("    yarn start - Start a snowpack dev server");
    logIt("    yarn build - Build for production");
    console.log();
    logIt(
      "Note: All JavaScript was moved into the src folder, so you may have to fix imports and stuff."
    );
  });
program.parse();
// totally a real logger lib
function logIt(msg: string) {
  console.log(chalk`{dim [devit]} ${msg}`);
}

export function pathJoin(parts: string[], sep: string) {
  return parts
    .map((part) => {
      const part2 = part.endsWith(sep)
        ? part.substring(0, part.length - 1)
        : part;
      return part2.startsWith(sep) ? part2.substr(1) : part2;
    })
    .join(sep);
}
