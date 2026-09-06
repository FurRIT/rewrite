import { tryGetElementOfTypeById } from "./utils/dom.ts";

type SearchableEntityName = "user" | "event";
type SearchableEntityNamePlural = `${SearchableEntityName}s`;

type SearchEndpoint = `/${SearchableEntityNamePlural}`;

type PartialPath = `./search/${SearchableEntityName}.ts`;

import { paths } from "./api.schema.d.ts";

import Component from "component";
import * as params from "@params";

const API_URL: string = params.url;
const ENTITY: SearchableEntityName = params.entity;

type OkResponse = paths[SearchEndpoint]["get"]["responses"][200]["content"][
  "application/json"
];

async function search(query: string | null): Promise<OkResponse | null> {
  const url = new URL(API_URL);
  if (query !== null) {
    url.searchParams.set("query", query);
  }

  const urlenc = url.toString();
  const response = await fetch(urlenc);

  if (!response.ok) {
    return null;
  }
  return response.json();
}

// Search using the (optional) query and render the results to the container.
async function searchRender(
  query: string | null,
  resultsContainer: HTMLElement,
) {
  // Clear the result container children to reset search results.
  resultsContainer.innerHTML = "";

  const response = await search(query);
  if (response === null) {
    return;
  }

  const typedRender = Component as (
    item: OkResponse[SearchableEntityNamePlural],
  ) => HTMLElement;

  const items: OkResponse[SearchableEntityNamePlural] = response[`${ENTITY}s`];

  for (const item of items) {
    // @ts-ignore: limitation of ts
    const node = typedRender({ [ENTITY]: item });
    resultsContainer.appendChild(node);
  }
}

async function onSearchSubmit(
  queryTextbox: HTMLInputElement,
  resultsContainer: HTMLElement,
) {
  const query = queryTextbox.value.length > 0 ? queryTextbox.value : null;
  await searchRender(query, resultsContainer);
}

async function setup(): Promise<void> {
  const queryTextbox = tryGetElementOfTypeById("query", HTMLInputElement);
  const resultsContainer = tryGetElementOfTypeById(
    "search-results",
    HTMLElement,
  );
  const searchSubmitButton = tryGetElementOfTypeById(
    "search-submit",
    HTMLElement,
  );

  if (
    queryTextbox === null || searchSubmitButton === null ||
    resultsContainer === null
  ) {
    console.error("failed to load search DOM elements");
    return;
  }

  queryTextbox.addEventListener("keypress", (ev) => {
    if (ev.key === "Enter") {
      onSearchSubmit(queryTextbox, resultsContainer);
    }
  });
  searchSubmitButton.addEventListener(
    "click",
    () => onSearchSubmit(queryTextbox, resultsContainer),
  );

  // Do an initial render of all search results.
  await searchRender(null, resultsContainer);
}

// deno-lint-ignore no-window no-window-prefix
window.addEventListener("load", setup);
