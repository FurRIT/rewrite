import * as rawParams from "@params";

import { paths } from "../api.schema.d.ts";

import { PageScriptParams } from "./params.ts";
import { tryGetElementOfTypeById } from "../utils/dom.ts";

import { createToast, MessageLevel } from "../toast.ts";

const params: PageScriptParams = rawParams;

type FormElements = {
  usernameTextInput: HTMLInputElement;
  passwordTextInput: HTMLInputElement;
};

type FormBody =
  paths["/session"]["post"]["requestBody"]["content"]["application/json"];

async function onLoginSubmit(elements: FormElements) {
  const username = elements.usernameTextInput.value;
  const password = elements.passwordTextInput.value;

  if (username.length === 0) {
    return createToast(MessageLevel.WARNING, "Must specify username.");
  }
  if (password.length === 0) {
    return createToast(MessageLevel.WARNING, "Must specify password.");
  }

  const body: FormBody = { username, password };

  const url = new URL("/session", params.apiBase).href;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    const target = new URL("/users", params.siteBase).href;
    window.location.replace(target);

    return;
  }
  if (response.status === 403) {
    createToast(
      MessageLevel.DANGER,
      "Incorrect username or password.",
    );

    return;
  }

  createToast(
    MessageLevel.DANGER,
    `There was an unexpected error while attempting to login - received response status code ${response.status}.`,
  );
}

function setup(): void {
  const usernameTextInput = tryGetElementOfTypeById(
    "username",
    HTMLInputElement,
  );
  const passwordTextInput = tryGetElementOfTypeById(
    "password",
    HTMLInputElement,
  );
  const loginButton = tryGetElementOfTypeById(
    "login-button",
    HTMLButtonElement,
  );

  if (
    usernameTextInput === null ||
    passwordTextInput === null ||
    loginButton === null
  ) {
    console.error("failed to load login DOM elements");
    return;
  }

  const elements: FormElements = {
    usernameTextInput,
    passwordTextInput,
  };

  loginButton.addEventListener("click", () => {
    onLoginSubmit(elements);
  });
}

// deno-lint-ignore no-window no-window-prefix
window.addEventListener("load", setup);
