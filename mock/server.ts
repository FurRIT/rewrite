import { delay } from "@std/async/delay";
import { retry } from "@std/async/retry";
import { debounce } from "@std/async/debounce";
import { parseArgs } from "@std/cli/parse-args";
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
    { status: status },
  );
}

type HandlerCtx = {
  users: Record<string, User>;
  events: Record<string, Event>;
  modifying: boolean;
};

function makeHandler(indexed: HandlerCtx): (req: Request) => Response {
  return (req: Request): Response => {
    const url = new URL(req.url);

    if (url.pathname === "/events") {
      const projections = [];

      for (const event of Object.values(indexed.events)) {
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
      });
    }
    if (url.pathname === "/users") {
      const projections = [];

      for (const user of Object.values(indexed.users)) {
        projections.push(
          project(user, [
            "id",
            "name",
            "degrees",
            "class",
          ]),
        );
      }

      return new Response(JSON.stringify({ ok: true, events: projections }), {
        status: 200,
      });
    }

    const eventPattern = new URLPattern({ pathname: "/event/:id" });
    if (eventPattern.test(req.url)) {
      const match = eventPattern.exec(req.url);
      const id = match?.pathname.groups.id;

      if ((id === undefined) || !(id in indexed.events)) {
        return errorResponse(404);
      }

      const event = indexed.events[id];
      return new Response(JSON.stringify({ ok: true, event: event }), {
        status: 200,
      });
    }

    const userPattern = new URLPattern({ pathname: "/user/:id" });
    if (userPattern.test(req.url)) {
      const match = userPattern.exec(req.url);
      const id = match?.pathname.groups.id;

      if ((id === undefined) || !(id in indexed.users)) {
        return errorResponse(404);
      }

      const user = indexed.users[id];
      return new Response(JSON.stringify({ ok: true, user: user }), {
        status: 200,
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

  const ctx: HandlerCtx = { ...indexed, modifying: false };
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
