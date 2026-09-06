import { Temporal } from "temporal-polyfill";
import { components } from "../api.schema.d.ts";

import * as params from "@params";

const SITE_BASE: string = params.siteBase;

type DetailedEvent = components["schemas"]["DetailedEvent"];

const MAP_EMOJI = "🗺️";
const COMPUTER_EMOJI = "🖥️";
const CALENDAR_EMOJI = "📅";

function EventTime(event: DetailedEvent) {
  // Cannot display an event time if either the start or end are undefined.
  if (event.dtstart === undefined || event.dtend === undefined) {
    return <p>{CALENDAR_EMOJI} Unknown</p>;
  }

  const startForeign = Temporal.ZonedDateTime.from(event.dtstart);
  const endForeign = Temporal.ZonedDateTime.from(event.dtend);

  const timeZone = Temporal.Now.timeZoneId();

  const startNative = startForeign.withTimeZone(timeZone);
  const endNative = endForeign.withTimeZone(timeZone);

  const extractDate = (native: Temporal.ZonedDateTime): string =>
    native.toPlainDate().toLocaleString(undefined, { dateStyle: "long" });
  const extractTime = (native: Temporal.ZonedDateTime): string =>
    native.toPlainTime().toLocaleString(undefined, { timeStyle: "short" });

  let formattedRange: string;
  if (startNative.dayOfYear === endNative.dayOfYear) {
    formattedRange = `${extractDate(startNative)} ${extractTime(startNative)} - ${extractTime(endNative)}`;
  } else {
    formattedRange = `${extractDate(startNative)} ${extractTime(startNative)} - ${extractDate(endNative)} ${extractTime(endNative)}`;
  }

  return (
    <p>
      {CALENDAR_EMOJI} <strong>{formattedRange}</strong>
    </p>
  );
}

export default function Event(props: { event: DetailedEvent }) {
  const eventUrl = `${SITE_BASE}event/${props.event.id}`;

  const locationEmoji =
    props.event.location === "online" ? COMPUTER_EMOJI : MAP_EMOJI;
  const locationText =
    props.event.location === "online"
      ? "Online (Discord)"
      : props.event.location;

  let organizerLink;
  if (props.event.organizer !== null) {
    const href = `/user/${props.event.organizer.id}`;

    organizerLink = (
      <p>
        - Organizer:{" "}
        <a
          href={href}
          class="text-(--legacy-color-brown-40) hover:text-(--legacy-color-brown-30) hover:underline"
        >
          {props.event.organizer.name}
        </a>
      </p>
    );
  } else {
    organizerLink = <p> - Organizer: [?]</p>;
  }

  return (
    <a class="mx-auto block w-full rounded-xl bg-white pb-3" href={eventUrl}>
      <div class="pl-3 [&>*]:mb-1">
        <h3 class="mx-auto pt-1">{props.event.title}</h3>
        <EventTime {...props.event} />
        <p>
          {locationEmoji} {locationText}
        </p>
        <p>{props.event.description}</p>
        {organizerLink}
      </div>
    </a>
  );
}
