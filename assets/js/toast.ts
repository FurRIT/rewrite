// Module for placing toast messages (short dismissable messages) on the page -
// used for error responses.
//
// Relies on the "toast-anchor" partial.

import Message from "./toast/Message.tsx";
import { MessageLevel } from "./toast/level.ts";
import { tryGetElementOfTypeById } from "./utils/dom.ts";

export { MessageLevel } from "./toast/level.ts";

function tryGetToastAnchorHTMLElement(): HTMLElement | null {
  const parent = tryGetElementOfTypeById("toast-anchor", HTMLDivElement);
  if (parent === null) {
    return null;
  }

  const child = parent.children[0];
  if (!(child instanceof HTMLElement)) {
    return null;
  }

  return child;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export function createToast(
  level: MessageLevel,
  message: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
) {
  const parent = tryGetToastAnchorHTMLElement();
  if (parent === null) {
    return;
  }

  const child = Message({ level, message, timeout });
  const ref = child as unknown as HTMLElement;

  parent.prepend(ref);
  ref.scrollIntoView();
}
