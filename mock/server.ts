import assert from "node:assert";

import { retry } from "@std/async/retry";
import { debounce } from "@std/async/debounce";
import { parseArgs } from "@std/cli/parse-args";

import MiniSearch from "minisearch";
import { getReasonPhrase } from "http-status-codes";

import { Event, MockData, User } from "./data.ts";

function project<T extends object, K extends keyof T>(
  source: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in source) {
      result[key] = source[key];
    }
  }

  return result;
}

function errorResponse(status: number): Response {
  return new Response(
    JSON.stringify({ ok: false, msg: getReasonPhrase(status) }),
    { status: status, headers: CORS_HEADERS },
  );
}

type ResponseInit = Exclude<
  ConstructorParameters<typeof Response>[1],
  undefined
>;

type ResponseInitHeaders = Exclude<ResponseInit["headers"], undefined>;

const CORS_HEADERS: ResponseInitHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:1313",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

type HandlerCtx = {
  users: Record<string, User>;
  events: Record<string, Event>;
  modifying: boolean;
  userSearch: MiniSearch<User>;
};

function makeHandler(ctx: HandlerCtx): (req: Request) => Response {
  return (req: Request): Response => {
    const url = new URL(req.url);

    if (url.pathname === "/api/events") {
      const projections = [];

      for (const event of Object.values(ctx.events)) {
        projections.push(
          project(event, [
            "id",
            "summary",
            "location",
            "status",
            "dtstart",
            "dtend",
            "organizer",
          ]),
        );
      }

      return new Response(JSON.stringify({ ok: true, events: projections }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }
    if (url.pathname === "/api/users") {
      const queryParam = url.searchParams.get("query");

      let results;
      if (queryParam === null) {
        results = Object.values(ctx.users);
      } else {
        const search = ctx.userSearch.search(queryParam);
        results = search.map((item) => ctx.users[item.id]);
      }

      const projections = [];

      for (const user of results) {
        projections.push(
          project(user, [
            "id",
            "name",
            "degrees",
            "class",
          ]),
        );
      }

      return new Response(JSON.stringify({ ok: true, users: projections }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    const eventPattern = new URLPattern({ pathname: "/api/event/:id" });
    if (eventPattern.test(req.url)) {
      const match = eventPattern.exec(req.url);
      const id = match?.pathname.groups.id;

      if ((id === undefined) || !(id in ctx.events)) {
        return errorResponse(404);
      }

      const event = ctx.events[id];
      return new Response(JSON.stringify({ ok: true, event: event }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    const userPattern = new URLPattern({ pathname: "/api/user/:id" });
    if (userPattern.test(req.url)) {
      const match = userPattern.exec(req.url);
      const id = match?.pathname.groups.id;

      if ((id === undefined) || !(id in ctx.users)) {
        return errorResponse(404);
      }

      const user = ctx.users[id];
      return new Response(JSON.stringify({ ok: true, user: user }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }
    return errorResponse(404);
  };
}

async function makeServer(
  path: string,
): Promise<[Deno.HttpServer<Deno.Addr>, HandlerCtx]> {
  let mock: MockData | null = null;

  {
    const text = await Deno.readTextFile(path);
    mock = JSON.parse(text) as MockData;
  }

  const indexed: {
    users: Record<string, User>;
    events: Record<string, Event>;
  } = { users: {}, events: {} };
  for (const user of mock.users) {
    indexed.users[user.id] = user;
  }
  for (const event of mock.events) {
    indexed.events[event.id] = event;
  }

  const userSearch = new MiniSearch({
    idField: "id",
    fields: [
      "name",
      "telegramUsername",
      "degrees",
      "sonaName",
      "sonaSpecies",
      "socialHandle",
    ],
    // @ts-ignore: specialization that is representative
    extractField: (
      document: User,
      fieldName:
        | keyof User
        | "major"
        | "sonaName"
        | "sonaSpecies"
        | "socialHandle",
    ) => {
      if (fieldName in document) {
        // @ts-ignore: issue with resolution
        return document[fieldName];
      }

      if (fieldName === "major") {
        return document.degrees.join(" ");
      }
      if (fieldName === "sonaName") {
        return document.sonas.map((sona) => sona.name).join(" ");
      }
      if (fieldName === "sonaSpecies") {
        return document.sonas.map((sona) => sona.species).join(" ");
      }
      if (fieldName === "socialHandle") {
        return document.socials.map((social) => social.handle).join(" ");
      }

      assert(false);
    },
    searchOptions: {
      prefix: true,
    },
  });
  userSearch.addAll(mock.users);

  const ctx: HandlerCtx = { ...indexed, userSearch, modifying: false };
  return [
    Deno.serve({
      onListen({ port, hostname }) {
        console.log(`Server started on http://${hostname}:${port}`);
      },
    }, makeHandler(ctx)),
    ctx,
  ];
}

async function main() {
  const flags = parseArgs(Deno.args, {
    alias: { data: "d" },
    string: ["data"],
    default: {
      data: null,
    },
  });

  if (flags.data === null) {
    console.error("error: -d, --data must be provided");
    process.exit(1);
  }
  const dataPath: string = flags.data;

  let [server, ctx] = await makeServer(dataPath);

  const onEvent = async (_: Deno.FsEvent) => {
    console.log(dataPath, "modified; reloading...");
    if (ctx.modifying) {
      return;
    }

    await server.shutdown();
    [server, ctx] = await makeServer(dataPath);
  };

  const debounceOnEvent = debounce(onEvent, 300);

  Deno.addSignalListener("SIGINT", async () => {
    console.log("shutting down");
    await server.shutdown();
  });

  while (true) {
    const watcher = Deno.watchFs(dataPath);

    for await (const event of watcher) {
      if (event.kind === "remove") {
        break;
      }

      debounceOnEvent(event);
    }

    // If the file was removed (see break above) - attempt to stat the file
    // repeatedly assuming that it will be rewritten.
    await retry(() => Deno.stat(dataPath), { maxAttempts: 3, minTimeout: 200 });
  }
}

await main();
