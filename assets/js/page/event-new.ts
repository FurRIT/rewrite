import * as rawParams from "@params";

import { paths } from "../api.schema.d.ts";

import { PageScriptParams } from "./params.ts";
import { tryGetElementOfTypeById } from "../utils/dom.ts";

import { createToast, MessageLevel } from "../toast.ts";
import { checkFormReportErrors, FormError } from "../form.ts";

const params: PageScriptParams = rawParams;

type FormElements = {
  titleTextInput: HTMLInputElement;
  locationTextInput: HTMLInputElement;
  onlineCheckbox: HTMLInputElement;
  dateDateInput: HTMLInputElement;
  startTimeInput: HTMLInputElement;
  endTimeInput: HTMLInputElement;
  statusSelect: HTMLSelectElement;
  descriptionTextArea: HTMLTextAreaElement;
  createButton: HTMLElement;
};

type FormBody =
  paths["/event"]["post"]["requestBody"]["content"]["application/json"];

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

type FormParts = {
  title: string;
  description: string;
  location: "online" | string;
  date: string;
  startTime: string;
  endTime: string;
  status: "tentative" | "confirmed";
};

// Collect the form parts into a single object - where an invalid value is
// represented with 'null', keeping track of FormErrors.
function collectFormParts(
  elements: FormElements,
): [Nullable<FormParts>, FormError[]] {
  const errors = [];

  const title = elements.titleTextInput.value;
  if (title.length === 0) {
    errors.push(
      new FormError(
        "Required",
        elements.titleTextInput,
      ),
    );
  }

  const description = elements.descriptionTextArea.value;
  if (description.length === 0) {
    errors.push(
      new FormError(
        "Required",
        elements.descriptionTextArea,
      ),
    );
  }

  let location = "online";
  if (!elements.onlineCheckbox.checked) {
    const locationText = elements.locationTextInput.value;

    if (locationText.length === 0) {
      errors.push(
        new FormError(
          "Required (or Online)",
          elements.locationTextInput,
        ),
      );
    }
    location = locationText;
  }

  const date = elements.dateDateInput.value;
  if (date.length === 0) {
    errors.push(new FormError("Required", elements.dateDateInput));
  }

  const startTime = elements.startTimeInput.value;
  if (startTime.length === 0) {
    errors.push(new FormError("Required", elements.startTimeInput));
  }

  const endTime = elements.endTimeInput.value;
  if (endTime.length === 0) {
    errors.push(new FormError("Required", elements.endTimeInput));
  }

  const status = elements.statusSelect.value;
  if (!(status === "tentative" || status === "confirmed")) {
    errors.push(
      new FormError(
        "Invalid Value",
        elements.statusSelect,
      ),
    );
  }

  const parts = {
    title: title.length !== 0 ? title : null,
    description: description.length !== 0 ? description : null,
    location: location.length !== 0 ? location : null,
    date: date.length !== 0 ? date : null,
    startTime: startTime.length !== 0 ? startTime : null,
    endTime: endTime.length !== 0 ? endTime : null,
    status: status === "tentative" || status === "confirmed"
      ? (status as "tentative" | "confirmed")
      : null,
  };
  return [parts, errors];
}

const MINIMUM_DURATION_MINUTES = 30;

// Parse information from the set of form elements into a request body -
// validating the contents and collecting FormError(s) if the contents don't
// make sense.
function intoBody(
  elements: FormElements,
): [FormBody | null, FormError | FormError[]] {
  const errors = [];

  const [parts, partsErrors] = collectFormParts(elements);
  errors.push(...partsErrors);

  const now = Temporal.Now;
  const parseInt10 = (item: string) => parseInt(item);

  let startZonedDateTime: Temporal.ZonedDateTime | null = null;
  let endZonedDateTime: Temporal.ZonedDateTime | null = null;

  if (parts.date !== null) {
    const [year, month, day] = parts.date.split("-").map(parseInt10);

    const terminalZonedDateTime = (hour: number, minute: number) =>
      Temporal.ZonedDateTime.from({
        year,
        month,
        day,
        hour,
        minute,
        timeZone: now.timeZoneId(),
      });

    const startPlainDate = Temporal.PlainDate.from({ year, month, day });
    const nowPlainDate = now.plainDateISO();

    let failedAtDate = false;
    if (Temporal.PlainDate.compare(nowPlainDate, startPlainDate) === 1) {
      failedAtDate = true;
      errors.push(
        new FormError("Cannot start in the past", elements.dateDateInput),
      );
    }

    if (!failedAtDate && parts.startTime !== null) {
      const [startHour, startMinute] = parts.startTime.split(":").map(
        parseInt10,
      );
      startZonedDateTime = terminalZonedDateTime(startHour, startMinute);

      // We already checked the *plain date* as compared to now above - so if
      // anything the time placed us over.
      if (
        Temporal.ZonedDateTime.compare(
          now.zonedDateTimeISO(),
          startZonedDateTime,
        ) !==
          -1
      ) {
        errors.push(
          new FormError("Cannot start in the past", elements.startTimeInput),
        );
      }
    }

    if (!failedAtDate && parts.endTime !== null) {
      const [endHour, endMinute] = parts.endTime.split(":").map(parseInt10);
      endZonedDateTime = terminalZonedDateTime(endHour, endMinute);
    }
  }

  if (startZonedDateTime !== null && endZonedDateTime !== null) {
    if (
      Temporal.ZonedDateTime.compare(startZonedDateTime, endZonedDateTime) !==
        -1
    ) {
      errors.push(
        new FormError(
          "End Time must come after Start Time",
          elements.endTimeInput,
        ),
      );
    }

    const duration = startZonedDateTime.until(endZonedDateTime);
    if (duration.hours === 0 && duration.minutes < MINIMUM_DURATION_MINUTES) {
      errors.push(
        new FormError(
          `Duration must be at least ${MINIMUM_DURATION_MINUTES} minutes`,
          elements.endTimeInput,
        ),
      );
    }
  }

  if (
    errors.length !== 0 || parts.title === null ||
    parts.description === null || parts.location === null ||
    parts.date === null ||
    startZonedDateTime === null || endZonedDateTime === null ||
    parts.status === null
  ) {
    return [null, errors];
  }

  const body: FormBody = {
    title: parts.title,
    location: parts.location,
    status: parts.status,
    dtstart: startZonedDateTime.toString(),
    dtend: endZonedDateTime.toString(),
    description: parts.description,
  };
  return [body, errors];
}

async function onCreateSubmit(elements: FormElements) {
  const maybeBody = checkFormReportErrors(intoBody, elements);
  if (maybeBody === null) {
    createToast(
      MessageLevel.WARNING,
      "There are still form fields with issues that must be fixed before the Event can be created.",
      2_000,
    );
    return;
  }

  const body: FormBody = maybeBody;

  const url = new URL("/event", params.apiBase).href;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !(response.status === 200)) {
    createToast(
      MessageLevel.DANGER,
      `There was an unexpected error while creating the Event - received response status code ${response.status}.`,
    );
    return;
  }

  type OkResponse =
    paths["/event"]["post"]["responses"]["200"]["content"]["application/json"];
  const back = await response.json() as OkResponse;

  const target = new URL(`/event/${back.id}`, params.siteBase).href;
  window.location.replace(target);
}

function setup(): void {
  const titleTextInput = tryGetElementOfTypeById("title", HTMLInputElement);
  const locationTextInput = tryGetElementOfTypeById(
    "location",
    HTMLInputElement,
  );
  const onlineCheckbox = tryGetElementOfTypeById("isonline", HTMLInputElement);
  const dateDateInput = tryGetElementOfTypeById("date", HTMLInputElement);
  const startTimeInput = tryGetElementOfTypeById("start", HTMLInputElement);
  const endTimeInput = tryGetElementOfTypeById("end", HTMLInputElement);
  const statusSelect = tryGetElementOfTypeById("status", HTMLSelectElement);
  const descriptionTextArea = tryGetElementOfTypeById(
    "description",
    HTMLTextAreaElement,
  );
  const createButton = tryGetElementOfTypeById("create", HTMLElement);

  if (
    titleTextInput === null ||
    locationTextInput === null ||
    onlineCheckbox === null ||
    dateDateInput === null ||
    startTimeInput === null ||
    endTimeInput === null ||
    statusSelect === null ||
    descriptionTextArea === null ||
    createButton === null
  ) {
    console.error("failed to load event-new DOM elements");
    return;
  }

  const elements: FormElements = {
    titleTextInput,
    locationTextInput,
    onlineCheckbox,
    dateDateInput,
    startTimeInput,
    endTimeInput,
    statusSelect,
    descriptionTextArea,
    createButton,
  };

  const changeChecker = () => checkFormReportErrors(intoBody, elements);

  for (const element of Object.values(elements)) {
    element.addEventListener("change", changeChecker);
  }

  onlineCheckbox.removeEventListener("change", changeChecker);
  onlineCheckbox.addEventListener("change", () => {
    checkFormReportErrors(intoBody, elements);
    locationTextInput.disabled = onlineCheckbox.checked;
  });

  createButton.addEventListener("click", () => {
    onCreateSubmit(elements);
  });

  changeChecker();
}

// deno-lint-ignore no-window no-window-prefix
window.addEventListener("load", setup);
