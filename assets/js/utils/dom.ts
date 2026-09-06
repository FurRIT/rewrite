/**
 * Try to get a DOM object - ensure that the DOM element is the given type.
 *
 * Utility function for ensuring that a DOM element can be acquired - prints out
 * a helpful console.error message if that is not the case.
 *
 * @param id The identifier of the element.
 * @param type The class of the
 * @returns The element if it could be queried, null otherwise.
 */
export function tryGetElementOfTypeById<E extends HTMLElement>(
  id: string,
  // deno-lint-ignore no-explicit-any
  type: new (...args: any[]) => E,
): E | null {
  const el = document.getElementById(id);

  if (el === null) {
    console.error(`failed to load dom element (id="${id}")`);
    return null;
  }

  if (!(el instanceof type)) {
    console.error(
      `element (id="${id}") does not match expected type ${type.name}`,
    );
    return null;
  }
  return el;
}
