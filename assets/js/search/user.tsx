import { components } from "../api.schema.d.ts";

type SparseUser = components["schemas"]["SparseUser"];

function Degrees(props: { degrees: string[] }) {
  if (props.degrees.length === 0) {
    return <div></div>;
  }

  const major = props.degrees.length === 1 ? "Major" : "Majors";
  const joined = props.degrees.join(", ");

  return (
    <div>
      <strong>{major}</strong> {joined}
    </div>
  );
}

function Class(props: { classYear: number | null }) {
  console.log(props);
  if (props.classYear === null) {
    return <div></div>;
  }

  return (
    <div>
      <strong>Class of</strong> {props.classYear}
    </div>
  );
}

export default function User(props: { user: SparseUser }) {
  return (
    <div class="p-auto mx-auto h-32 w-[100%] rounded-xl bg-white sm:h-64 sm:w-[50%] md:h-64 md:w-[40%] lg:h-64 lg:w-[30%]">
      <h3>{props.user.name}</h3>
      <Degrees degrees={props.user.degrees} />
      <Class classYear={props.user.class} />
    </div>
  );
}
