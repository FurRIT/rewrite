import { parseArgs } from "@std/cli/parse-args";

import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker";

export type User = {
  id: string;
  name: string;
  degrees: string[];
  class: number;
  aboutMe: string;
  telegramUsername: string;
  sonas: { name: string; species: string }[];
  socials: { platform: string; handle: string }[];
};

export type Rsvp = {
  id: string;
  user: { id: string; name: string };
  answer: "no" | "maybe" | "yes";
};

export type Event = {
  id: string;
  description: string;
  summary: string;
  location: string;
  status: "canceled" | "tentative" | "confirmed";
  dtstart: string;
  dtend: string;
  organizer: { id: string; name: string };
  rsvps: Rsvp[];
};

export type MockData = {
  users: User[];
  events: Event[];
};

const N_RANDOM_USERS = 20;
const N_RANDOM_EVENTS = 3;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function randomchoice<T>(...items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomUser(): User {
  return {
    "id": uuidv4(),
    "name": faker.person.firstName(),
    "degrees": [
      capitalize(faker.word.noun()) + " B.S.",
    ],
    "class": faker.number.int({ min: 2003, max: 2035 }),
    "aboutMe": faker.lorem.text(),
    "telegramUsername": faker.internet.username(),
    "sonas": [
      {
        "name": faker.person.firstName(),
        "species": randomchoice(
          faker.animal.bear,
          faker.animal.bird,
          faker.animal.cat,
          faker.animal.cetacean,
          faker.animal.cow,
          faker.animal.crocodilia,
          faker.animal.dog,
          faker.animal.fish,
          faker.animal.horse,
          faker.animal.insect,
          faker.animal.lion,
          faker.animal.rabbit,
          faker.animal.snake,
        )(),
      },
    ],
    "socials": [
      {
        "platform": faker.helpers.arrayElement([
          "discord",
          "twitter",
          "bluesky",
        ]),
        "handle": faker.internet.username(),
      },
    ],
  };
}

function randomEvent(usersMap: Record<string, User>): Event {
  const nowDate = Temporal.Now.plainDateTimeISO();

  const dayOffset = Temporal.Duration.from({
    days: faker.number.int({ min: 2, max: 20 }),
  });

  const startDate = nowDate.add(dayOffset);

  const startDateTime = startDate.with({
    hour: faker.number.int({ min: 9, max: 19 }),
    minute: randomchoice(0, 15, 30, 45),
    second: 0,
    millisecond: 0,
    microsecond: 0,
  });
  const eventDuration = Temporal.Duration.from({
    "hours": faker.number.int({ min: 2, max: 4 }),
  });

  const endDateTime = startDateTime.add(eventDuration);

  const organizer = randomchoice(...Object.values(usersMap));

  const max_n_rsvps = Math.ceil(0.75 * Object.keys(usersMap).length);
  const n_rsvps = faker.number.int({ min: 1, max: max_n_rsvps });

  function randomRsvp(): Rsvp {
    const user = randomchoice(...Object.values(usersMap));

    return {
      "id": uuidv4(),
      "user": { "id": user.id, "name": user.name },
      "answer": randomchoice("no", "maybe", "yes"),
    };
  }

  const rsvps = [];

  for (let i = 0; i < n_rsvps; i++) {
    rsvps.push(randomRsvp());
  }

  return {
    "id": uuidv4(),
    "description": faker.lorem.paragraph(),
    "summary": faker.lorem.words({ min: 5, max: 10 }),
    "location": randomchoice(() => "online", faker.location.streetAddress)(),
    "status": faker.helpers.arrayElement([
      "canceled",
      "tentative",
      "confirmed",
    ]),
    "dtstart": startDateTime.toString(),
    "dtend": endDateTime.toString(),
    "organizer": { "id": organizer.id, "name": organizer.name },
    "rsvps": rsvps,
  };
}

async function main() {
  const flags = parseArgs(Deno.args, {
    alias: { output: "o" },
    string: ["output"],
    default: {
      output: null,
    },
  });

  const usersMap: Record<string, User> = {};
  const events: Event[] = [];

  for (let i = 0; i < N_RANDOM_USERS; i++) {
    const user = randomUser();
    usersMap[user.id] = user;
  }

  for (let i = 0; i < N_RANDOM_EVENTS; i++) {
    const event = randomEvent(usersMap);
    events.push(event);
  }

  const ser = JSON.stringify({ users: Object.values(usersMap), events });

  if (flags.output !== null) {
    await Deno.writeTextFile(flags.output, ser);
  } else {
    process.stdout.write(ser);
  }
}

await main();
