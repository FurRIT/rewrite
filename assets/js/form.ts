// For working with forms and the "form-feedback" partial.

type FormElementMap = Record<symbol | string, HTMLElement>;

type FormChecker<R, E extends FormElementMap> = (
  elements: E,
) => [R | null, FormError | FormError[]];

export class FormError extends Error {
  public readonly erroneous: HTMLElement | HTMLElement[];

  constructor(message: string, erroneous: HTMLElement | HTMLElement[]) {
    super(message);
    this.erroneous = erroneous;
  }
}

// Use the FormChecker to check the elements in a form - if there are any
// FormErrors update the associated form feedback elements.
export function checkFormReportErrors<R, E extends FormElementMap>(
  checker: FormChecker<R, E>,
  elements: E,
): R | null {
  for (const element of Object.values(elements)) {
    clearFeedback(element.id);
  }
  const [maybeReduced, errorOrErrors] = checker(elements);

  if (
    (errorOrErrors instanceof FormError) ||
    (Array.isArray(errorOrErrors) && errorOrErrors.length !== 0)
  ) {
    const errors: FormError[] = Array.isArray(errorOrErrors)
      ? errorOrErrors
      : [errorOrErrors];

    // Assume that errors reported earlier are more important than errors
    // reported later - install earlier messages.
    errors.reverse();
    for (const error of errors) {
      const elements: HTMLElement[] = Array.isArray(error.erroneous)
        ? error.erroneous
        : [error.erroneous];

      for (const element of elements) {
        setFeedback(element.id, error.message);
      }
    }
  }

  return maybeReduced;
}
export function setFeedback(elementId: string, message: string) {
  const targetId = `${elementId}-feedback`;
  const element = document.getElementById(targetId);

  if (element === null) {
    return;
  }

  const child = document.createElement("p");
  child.append(`* ${message}`);

  element.appendChild(child);
}

export function clearFeedback(elementId: string) {
  const targetId = `${elementId}-feedback`;
  const element = document.getElementById(targetId);

  if (element === null) {
    return;
  }
  element.replaceChildren();
}
