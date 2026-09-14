import assert from "node:assert";

import * as path from "@std/path";
import { retry } from "@std/async/retry";
import { debounce } from "@std/async/debounce";
import { parseArgs } from "@std/cli/parse-args";

import MiniSearch from "minisearch";
import { v4 as uuidv4 } from "uuid";
import { getReasonPhrase } from "http-status-codes";
import { fileTypeFromBuffer } from "file-type";

import { Event, MockData, User } from "./data.ts";
import { paths } from "./api.schema.d.ts";

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
  "Access-Control-Allow-Headers": "Content-Type",
};

type RequestHandler = (req: Request) => Promise<Response>;

type HandlerCtx = {
  users: Record<string, User>;
  events: Record<string, Event>;
  modifying: boolean;
  userMeId: string | null;
  userSearch: MiniSearch<User>;
  dataPath: string;
  mediaPath: string;
};

type HTTPMethod = "GET" | "POST";

type RequestHandlerMeta = { url: URL; pattern: URLPattern };
type RequestHandlerMetaStore = WeakMap<Request, RequestHandlerMeta>;

class ServeMux {
  handlers: Map<[HTTPMethod, URLPattern], RequestHandler>;

  constructor() {
    this.handlers = new Map();
  }

  addPath(
    method: HTTPMethod,
    pathname: string,
    handler: (req: Request) => Promise<Response>,
  ) {
    const pattern = new URLPattern({ pathname });
    this.handlers.set([method, pattern], handler);
  }

  intoHandler(
    metadata: RequestHandlerMetaStore,
  ): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      let matching: [RequestHandler, RequestHandlerMeta] | null = null;

      for (const [[method, pattern], handler] of this.handlers.entries()) {
        if (!pattern.test(req.url)) {
          continue;
        }

        if (req.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: { ...CORS_HEADERS },
          });
        } else if (req.method !== method) {
          continue;
        }

        const url = new URL(req.url);
        matching = [handler, { url, pattern }];
        break;
      }

      if (matching !== null) {
        const [handler, entry] = matching;
        metadata.set(req, entry);

        const result = await handler(req);
        metadata.delete(req);

        return result;
      }
      return errorResponse(404);
    };
  }
}

function makeHandler(ctx: HandlerCtx): (req: Request) => Promise<Response> {
  const servemux = new ServeMux();
  const metadata: RequestHandlerMetaStore = new WeakMap();

  servemux.addPath(
    "GET",
    "/api/events",
    // deno-lint-ignore require-await
    async (_: Request): Promise<Response> => {
      const projections = [];

      for (const event of Object.values(ctx.events)) {
        projections.push(
          project(event, [
            "id",
            "title",
            "location",
            "status",
            "dtstart",
            "dtend",
            "organizer",
            "description",
          ]),
        );
      }

      return new Response(JSON.stringify({ ok: true, events: projections }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    },
  );

  servemux.addPath(
    "GET",
    "/api/users",
    // deno-lint-ignore require-await
    async (req: Request): Promise<Response> => {
      const meta = metadata.get(req);
      assert(meta !== undefined);

      const queryParam = meta.url.searchParams.get("query");

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
            "profilePicture",
          ]),
        );
      }

      return new Response(JSON.stringify({ ok: true, users: projections }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    },
  );

  servemux.addPath(
    "GET",
    "/api/event/:id",
    // deno-lint-ignore require-await
    async (req: Request): Promise<Response> => {
      const meta = metadata.get(req);
      assert(meta !== undefined);

      const match = meta.pattern.exec(req.url);
      const id = match?.pathname.groups.id;

      if ((id === undefined) || !(id in ctx.events)) {
        return errorResponse(404);
      }

      const event = ctx.events[id];
      return new Response(JSON.stringify({ ok: true, event: event }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    },
  );

  servemux.addPath(
    "GET",
    "/api/user/:id",
    // deno-lint-ignore require-await
    async (req: Request): Promise<Response> => {
      const meta = metadata.get(req);
      assert(meta !== undefined);

      const match = meta.pattern.exec(req.url);
      const pathId = match?.pathname.groups.id;

      const projectUser = (user: User) => {
        return project(user, [
          "id",
          "name",
          "degrees",
          "class",
          "aboutMe",
          "telegramUsername",
          "sonas",
          "socials",
          "profilePicture",
        ]);
      };

      let userId: string | null;
      if (pathId === "me") {
        // Invalidate the cache if the user was deleted somehow - shouldn't
        // happen in development.
        if ((ctx.userMeId !== null) && !(ctx.userMeId in ctx.users)) {
          ctx.userMeId = null;
        }

        userId = ctx.userMeId;
      } else {
        userId = pathId !== undefined ? pathId : null;
      }

      if ((userId === null) || !(userId in ctx.users)) {
        return errorResponse(404);
      }
      const user = ctx.users[userId];

      return new Response(
        JSON.stringify({ ok: true, user: projectUser(user) }),
        {
          status: 200,
          headers: CORS_HEADERS,
        },
      );
    },
  );

  servemux.addPath(
    "GET",
    "/api/media/:id",
    async (req: Request): Promise<Response> => {
      const meta = metadata.get(req);
      assert(meta !== undefined);

      const match = meta.pattern.exec(req.url);
      const id = match?.pathname.groups.id;

      const entries = new Set();
      const lister = Deno.readDir(ctx.mediaPath);

      for await (const entry of lister) {
        if (!entry.isFile) {
          continue;
        }

        entries.add(entry.name);
      }

      if ((id === undefined) || !(entries.has(id))) {
        return errorResponse(404);
      }

      const source = path.join(ctx.mediaPath, id);
      const buffer = await Deno.readFile(source);

      const result = await fileTypeFromBuffer(buffer);
      assert(result !== undefined);

      return new Response(buffer, {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": result.mime },
      });
    },
  );

  servemux.addPath(
    "POST",
    "/event",
    async (req: Request): Promise<Response> => {
      type PostEvent =
        paths["/event"]["post"]["requestBody"]["content"]["application/json"];
      type Response = paths["/event"]["post"]["responses"]["200"]["content"][
        "application/json"
      ];
      const rbody: PostEvent = await req.json();

      if (ctx.userMeId === null) {
        return new Response(null, { status: 500 });
      }
      const me = ctx.users[ctx.userMeId];

      let eventId;

      {
        ctx.modifying = true;

        const uuid = uuidv4();
        const event: Event = {
          id: uuid,
          description: rbody.description,
          title: rbody.title,
          location: rbody.location,
          status: rbody.status,
          dtstart: rbody.dtstart,
          dtend: rbody.dtend,
          organizer: {
            id: ctx.userMeId,
            name: me.name,
          },
          rsvps: [],
        };

        eventId = event.id;
        ctx.events[event.id] = event;

        let mock: any;
        {
          const text = await Deno.readTextFile(ctx.dataPath);
          mock = JSON.parse(text) as MockData;
        }

        mock.events.push(event);

        {
          const text = JSON.stringify(mock);
          await Deno.writeTextFile(ctx.dataPath, text);
        }

        mock = null;

        ctx.modifying = false;
      }

      const body: Response = { ok: true, id: eventId };
      return new Response(JSON.stringify(body), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    },
  );

  servemux.addPath(
    "POST",
    "/session",
    async (req: Request): Promise<Response> => {
      type PostLogin =
        paths["/session"]["post"]["requestBody"]["content"]["application/json"];
      type Response = paths["/session"]["post"]["responses"]["201"]["content"][
        "application/json"
      ];

      const reqbody: PostLogin = await req.json();

      let found = null;
      for (const user of Object.values(ctx.users)) {
        if (
          user.username === reqbody.username &&
          user.password === reqbody.password
        ) {
          found = user;
        }
      }

      if (found === null) {
        return errorResponse(403);
      }

      const respbody: Response = { ok: true };
      return new Response(JSON.stringify(respbody), {
        headers: { ...CORS_HEADERS },
        status: 201,
      });
    },
  );

  return servemux.intoHandler(metadata);
}

async function makeServer(
  dataPath: string,
  mediaPath: string,
): Promise<[Deno.HttpServer<Deno.Addr>, HandlerCtx]> {
  let mock: MockData | null = null;

  {
    const text = await Deno.readTextFile(dataPath);
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

  let userMeId = null;
  for (const user of mock.users) {
    if (user.me) {
      userMeId = user.id;
      break;
    }
  }

  const ctx: HandlerCtx = {
    ...indexed,
    userSearch,
    userMeId,
    modifying: false,
    dataPath,
    mediaPath,
  };
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
    alias: { data: "d", media: "m" },
    string: ["data", "media"],
    default: {
      data: null,
      media: null,
    },
  });

  if (flags.data === null) {
    console.error("error: -d, --data must be provided");
    process.exit(1);
  }
  if (flags.media === null) {
    console.error("error: -m, --media must be provided");
    process.exit(1);
  }
  const dataPath: string = flags.data;
  const mediaPath: string = flags.media;

  let [server, ctx] = await makeServer(dataPath, mediaPath);

  const onEvent = async (_: Deno.FsEvent) => {
    // console.log(dataPath, "modified; reloading...");
    if (ctx.modifying) {
      return;
    }

    // Assume that we will always be the one generating the `data.json`
    // modification.
    return;

    await server.shutdown();
    [server, ctx] = await makeServer(dataPath, mediaPath);
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
