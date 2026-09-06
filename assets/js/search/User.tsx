import { components } from "../api.schema.d.ts";

import * as params from "@params";

const API_BASE: string = params.apiBase;
const SITE_BASE: string = params.siteBase;

type SparseUserWithProfilePicture =
  components["schemas"]["SparseUserWithProfilePicture"];

// The maximum length of the degrees field for a user; calibrated from:
// `max(degree_name.length) + (3/4 * avg(degree_name.length))`; minus three from
// the ellipsis substitution.
const MAX_DEGREES_LENGTH = 71;

function Degrees(props: { degrees: string[] }) {
  const header = props.degrees.length === 1 ? "Major" : "Majors";

  let value = props.degrees.join(", ");
  if (props.degrees.length === 0) {
    value = "[?]";
  }

  if (value.length > MAX_DEGREES_LENGTH) {
    value = value.slice(0, MAX_DEGREES_LENGTH) + "...";
  }

  return (
    <div class="mx-auto px-3 text-center">
      <strong>{header}</strong> {value}
    </div>
  );
}

function Class(props: { classYear: number | null }) {
  const value = props.classYear === null ? "[?]" : props.classYear;

  return (
    <div class="mx-auto px-3 text-center">
      <strong>Class of</strong> {value}
    </div>
  );
}

export default function User(props: { user: SparseUserWithProfilePicture }) {
  const imageUrl = `${API_BASE}${props.user.profilePicture}`;
  const userUrl = `${SITE_BASE}user/${props.user.id}`;

  return (
    <a
      class="mx-auto w-[60%] rounded-xl bg-(--legacy-color-warm-gray-80) pb-3 sm:w-[50%] md:w-[40%] lg:w-[30%]"
      href={userUrl}
    >
      <img
        class="mx-auto mt-3 mb-2 rounded-xs border-3 border-white sm:w-[50%] lg:w-[75%]"
        src={imageUrl}
      />
      <h3 class="mx-auto text-center">{props.user.name}</h3>
      <Degrees degrees={props.user.degrees} />
      <Class classYear={props.user.class} />
    </a>
  );
}
