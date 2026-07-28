type ElementProps = Record<string | symbol, unknown>;

type ElementTag =
  | string
  | ((props: ElementProps, children: Element[]) => HTMLElement);

type Element = {
  tag: string;
  props: ElementProps;
  children: Element[];
};

export function createElement(
  tag: ElementTag,
  props: ElementProps,
  ...children: Element[]
): HTMLElement {
  props = props ?? {};

  if (typeof tag === "function") {
    return tag(props, children);
  }

  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value !== "string") {
      continue;
    }
    element.setAttribute(key, value);
  }

  for (const child of children) {
    if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else if (typeof child === "string") {
      element.append(child);
    } else if (typeof child === "number") {
      element.append(`${child}`);
    } else if (typeof child === "object") {
      const node = createElement(child.tag, child.props, ...child.children);
      element.appendChild(node);
    }
  }

  return element;
}
