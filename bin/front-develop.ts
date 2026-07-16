#!/usr/bin/env -S deno run -A

import * as log from "@std/log";
import * as path from "@std/path";
import { exists } from "@std/fs/exists";
import { debounce } from "@std/async/debounce";
import { TextLineStream } from "@std/streams/text-line-stream";

import assert from "node:assert";
import { readdir, realpath } from "node:fs/promises";

log.setup({
  handlers: {
    fancy: new log.ConsoleHandler("DEBUG", {
      formatter: (record) => `[${record.levelName}] ${record.msg}`,
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["fancy"],
    },
  },
});

assert(import.meta.filename !== undefined);

const BIN_DIR_PATH = path.dirname(import.meta.filename);
const REPO_ROOT_DIR_PATH = await realpath(path.join(BIN_DIR_PATH, ".."));

const TOOL_BIN_DIR_PATH = path.relative(
  REPO_ROOT_DIR_PATH,
  path.join(REPO_ROOT_DIR_PATH, "target", "tool"),
);

const PARTIAL_RENDER_BIN_PATH = path.join(TOOL_BIN_DIR_PATH, "partial-render");

const PARTIAL_ROOT_DIR_PATH = path.join(REPO_ROOT_DIR_PATH, "partials");

async function* spawnPartialGenerator(
  outdir: string,
): AsyncGenerator<() => void, void, unknown> {
  const watcher = Deno.watchFs(PARTIAL_ROOT_DIR_PATH);

  async function* getPartialNamesPaths(): AsyncGenerator<
    [string, string],
    void,
    unknown
  > {
    const names = await readdir(PARTIAL_ROOT_DIR_PATH);

    for (const name of names) {
      const fullPath = path.join(PARTIAL_ROOT_DIR_PATH, name);
      const stat = await Deno.stat(fullPath);

      if (!stat.isDirectory) {
        continue;
      }

      yield [name, fullPath];
    }
  }

  const build = async () => {
    for await (const [name, sourceDirPath] of getPartialNamesPaths()) {
      const dataPath = path.join(sourceDirPath, "data.json");
      const templatePath = path.join(sourceDirPath, "template.html");

      const targetPath = path.join(outdir, `${name}.html`);
      const relativeTargetPath = path.relative(REPO_ROOT_DIR_PATH, targetPath);

      log.info(`[part] generating partial ${relativeTargetPath}`);

      const command = new Deno.Command(PARTIAL_RENDER_BIN_PATH, {
        args: ["-data", dataPath, "-template", templatePath],
        stdin: "piped",
        stdout: "piped",
      });
      const child = command.spawn();

      const { code, stdout } = await child.output();
      assert(code === 0);

      await Deno.writeFile(targetPath, stdout);
    }
  };
  const debounceBuild = debounce(build, 200);

  const cleanup = () => {
    watcher.close();
  };
  yield cleanup;

  await build();
  for await (const _ of watcher) {
    debounceBuild();
  }
}

async function* spawnBackendMock(
  datadir: string,
): AsyncGenerator<() => void, void, unknown> {
  const command = new Deno.Command("deno", {
    args: ["-A", "mock/server.ts", "--data", datadir],
    stdin: "piped",
    stdout: "piped",
  });
  const child = command.spawn();
  yield () => child.kill();

  const lines = child.stdout.pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TextLineStream(),
    );

  for await (const line of lines) {
    log.info(`[back] ${line}`);
  }
}

async function* spawnHugoGenerator(
  outdir: string,
): AsyncGenerator<() => void, void, unknown> {
  const command = new Deno.Command("go", {
    args: ["tool", "hugo", "server", "-d", outdir],
    stdin: "piped",
    stdout: "piped",
  });
  const child = command.spawn();
  yield () => child.kill();

  const lines = child.stdout.pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TextLineStream(),
    );

  for await (const line of lines) {
    log.info(`[hugo] ${line}`);
  }
}

async function generateMockData(outpath: string) {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["-A", "mock/data.ts", "-o", outpath],
    stdin: "null",
    stderr: "piped",
    stdout: "piped",
  });
  const child = command.spawn();

  const { code } = await child.output();
  assert(code === 0);

  const fancy = path.relative(REPO_ROOT_DIR_PATH, outpath);
  log.info(`[mock] created data file ${fancy}`);
}

const OUTPUT_DIR = path.join(REPO_ROOT_DIR_PATH, "develop");

async function main() {
  try {
    await Deno.stat(PARTIAL_RENDER_BIN_PATH);
  } catch {
    console.error("error: could not find", PARTIAL_RENDER_BIN_PATH);
    console.error("hint: have you run 'make' at least once?");
    Deno.exit(1);
  }

  if (!(await exists(OUTPUT_DIR))) {
    await Deno.mkdir(OUTPUT_DIR);
  }

  const hugoOutDir = path.join(OUTPUT_DIR, "hugo");
  const partialOutDir = path.join(OUTPUT_DIR, "partial");
  const mockDataOutPath = path.join(OUTPUT_DIR, "data.json");

  Deno.mkdir(hugoOutDir, { recursive: true });
  Deno.mkdir(partialOutDir, { recursive: true });

  await generateMockData(mockDataOutPath);

  const hugo = spawnHugoGenerator(hugoOutDir);
  const back = spawnBackendMock(mockDataOutPath);
  const partial = spawnPartialGenerator(partialOutDir);

  const hugoFirst = await hugo.next();
  assert(!hugoFirst.done);

  const backFirst = await back.next();
  assert(!backFirst.done);

  const partialFirst = await partial.next();
  assert(!partialFirst.done);

  const hugoKill = hugoFirst.value;
  const backKill = backFirst.value;
  const partialKill = partialFirst.value;

  const killAll = () => {
    hugoKill();
    backKill();
    partialKill();
  };

  Deno.addSignalListener("SIGINT", () => {
    killAll();
    Deno.exit(0);
  });
  Deno.addSignalListener("SIGTERM", () => {
    killAll();
    Deno.exit(0);
  });

  await Promise.race([
    hugo.next(),
    back.next(),
    partial.next(),
  ]);
}

await main();
