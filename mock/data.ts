import assert from "node:assert";
import * as path from "@std/path";
import { parseArgs } from "@std/cli/parse-args";

import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker";

const RIT_DEGREES = [
  "Accounting BS",
  "Accounting and Analytics MS",
  "Advertising and Public Relations BS",
  "Applied Arts and Sciences AAS",
  "Applied Arts and Sciences Diploma",
  "Applied and Computational Mathematics MS",
  "Applied Mathematics BS",
  "Applied Modern Language and Culture BS",
  "Applied Statistics MS",
  "Applied Statistics and Data Analytics BS",
  "Architecture M.Arch.",
  "Artificial Intelligence BS",
  "Artificial Intelligence MS",
  "ASL-English Interpretation BS",
  "Astrophysical Sciences and Technology MS",
  "Biochemistry BS",
  "Bioinformatics MS",
  "Bioinformatics and Computational Biology BS",
  "Biology BS",
  "Biomedical Engineering MS",
  "Biomedical Engineering BS",
  "Biomedical Sciences BS",
  "Biotechnology and Molecular Bioscience BS",
  "Business Administration for Executives MBA",
  "Business Administration for Executives - Online MBA",
  "Business Administration MBA",
  "Business Analytics and AI MS",
  "Business Exploration",
  "Ceramics MFA",
  "Chemical Engineering MS",
  "Chemical Engineering BS",
  "Chemistry BS",
  "Chemistry MS",
  "Civil Engineering Technology BS",
  "Color Science MS",
  "Communication BS",
  "Communication MS",
  "Community Development and Inclusive Leadership BS",
  "Computer Engineering MS",
  "Computer Engineering BS",
  "Computer Engineering Technology BS",
  "Computing Exploration",
  "Computational Mathematics BS",
  "Computer Science BS",
  "Computer Science MS",
  "Criminal Justice BS",
  "Cybersecurity BS",
  "Cybersecurity MS",
  "Data Science MS",
  "Deaf Education MS",
  "Diagnostic Medical Sonography (Ultrasound) BS",
  "Dietetics and Nutrition MS",
  "3D Digital Design BFA",
  "Economics BS",
  "Electrical Engineering BS",
  "Electrical Engineering MS",
  "Electrical Engineering Technology BS",
  "Embedded Systems MS",
  "Engineering Exploration",
  "Engineering Management MS",
  "Engineering Technology Exploration",
  "English BS",
  "Environmental, Health and Safety Management MS",
  "Environmental Science BS",
  "Environmental Science MS",
  "Environmental Sustainability, Health and Safety BS",
  "Exercise Science BS",
  "Experimental Psychology MS",
  "Film and Animation BFA",
  "Film and Animation MFA",
  "Finance MS",
  "Finance BS",
  "Fine Arts Studio MFA",
  "Furniture Design MFA",
  "Game Design and Development BS",
  "Game Design and Development MS",
  "Glass MFA",
  "Global Business Management BS",
  "Global Futures BS",
  "Global Public Health BS",
  "Global Supply Chain Management MS",
  "Graphic Design BFA",
  "Health Care Interpretation MS",
  "Health and Well-Being Management MS",
  "History BS",
  "Hospitality Business Management MS",
  "Hospitality and Tourism Management BS",
  "Humanities, Computing, and Design BS",
  "Human-Centered Computing BS",
  "Human-Computer Interaction MS",
  "Illustration BFA",
  "Imaging Science BS",
  "Imaging Science MS",
  "Individualized Program BS",
  "Industrial Design BFA",
  "Industrial Design MFA",
  "Industrial Engineering BS",
  "Industrial and Systems Engineering MS",
  "Information Technology BS",
  "Information Technology and Analytics MS",
  "Interior Design BFA",
  "International and Global Studies BS",
  "Liberal Arts Exploration",
  "Management Information Systems (MIS) BS",
  "Manufacturing Leadership MS",
  "Marketing BS",
  "Materials Science and Engineering MS",
  "Mechanical Engineering BS",
  "Mechanical Engineering ME",
  "Mechanical Engineering MS",
  "Mechanical Engineering Technology BS",
  "Mechatronics Engineering Technology BS",
  "Mechatronics and Mechanical Systems MS",
  "Medical Illustration BFA",
  "Medical Illustration MFA",
  "Metals and Jewelry Design MFA",
  "Microelectronic Engineering MS",
  "Microelectronic Engineering BS",
  "Motion Picture Science BS",
  "Museum Studies BS",
  "Neuroscience BS",
  "New Media Design BFA",
  "New Media Interactive Development BS",
  "Nutritional Sciences BS",
  "Occupational Therapy OTD",
  "Organizational Leadership and Innovation MS",
  "Packaging Science MS",
  "Packaging Science BS",
  "Philosophy BS",
  "Photographic Arts Exploration",
  "Photographic and Imaging Arts BFA",
  "Photographic Sciences BS",
  "Photography and Related Media MFA",
  "Physics BS",
  "Physics MS",
  "Physician Assistant BS/MS",
  "Political Science BS",
  "Product Development MS",
  "Professional Studies MS",
  "Project Management MS",
  "Psychology BS",
  "Robotics and Manufacturing Engineering Technology BS",
  "Science, Technology, and Public Policy MS",
  "Smart Cities Construction Management MS",
  "Sociology and Anthropology BS",
  "Software Engineering MS",
  "Software Engineering BS",
  "Studio Arts BFA",
  "Studio Arts Exploration",
  "Supply Chain Management BS",
  "Sustainable Systems MS",
  "Technology Innovation Management and Entrepreneurship MS",
  "Visual Arts–All Grades (Art Education) MST",
  "Visual Communication Design MFA",
  "Women’s, Gender, and Sexuality Studies BS",
];

export type User = {
  // Closely related to data model.
  id: string;
  name: string;
  degrees: string[];
  class: number | null;
  profilePicture: string;
  aboutMe: string;
  telegramUsername: string;
  sonas: { name: string; species: string }[];
  socials: { platform: string; handle: string }[];
  // Management/mocking related.
  me: boolean;
  username: string;
  password: string;
};

export type Rsvp = {
  id: string;
  user: { id: string; name: string };
  answer: "no" | "maybe" | "yes";
};

export type Event = {
  id: string;
  description: string;
  title: string;
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

type UserWithoutProfilePictureOrMe = Omit<User, "profilePicture" | "me">;

type UserWithoutMe = Omit<User, "me">;

function randomUser(): UserWithoutProfilePictureOrMe {
  return {
    "id": uuidv4(),
    "name": faker.person.firstName(),
    "degrees": (() => {
      const degrees = [];

      const single = () => randomchoice(...RIT_DEGREES);
      const amount = faker.number.int({ min: 0, max: 2 });

      for (let i = 0; i < amount; i++) {
        const degree = single();
        degrees.push(degree);
      }

      return degrees;
    })(),
    "class": faker.datatype.boolean()
      ? faker.number.int({ min: 2003, max: 2035 })
      : null,
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
    "username": faker.internet.username(),
    "password": faker.internet.password(),
  };
}

async function randomUserProfilePicture(
  mediaPath: string,
): Promise<string> {
  const url = faker.image.avatarGitHub();

  const response = await fetch(url);
  assert(response.ok && response.body !== null);

  let hash: string;
  {
    const arrbuff = await response.arrayBuffer();
    const buffer = new Uint8Array(arrbuff);

    const command = new Deno.Command("b3sum", {
      args: ["-"],
      stdin: "piped",
      stdout: "piped",
    });
    const child = command.spawn();

    const writer = child.stdin.getWriter();

    await writer.write(buffer);
    await writer.close();

    hash = await child.stdout.text();
    hash = hash.slice(0, -4);

    const target = path.join(mediaPath, hash);
    await Deno.writeFile(target, buffer);
  }

  return `/media/${hash}`;
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

  const title = capitalize(faker.word.adjective()) + " " +
    capitalize(faker.word.verb()) +
    randomchoice(" At The ", " Near The ", " By The ") +
    capitalize(faker.word.noun());

  return {
    "id": uuidv4(),
    "description": faker.lorem.paragraph(),
    "title": title,
    "location": randomchoice(() => "online", faker.location.streetAddress)(),
    "status": faker.helpers.arrayElement([
      "canceled",
      "tentative",
      "confirmed",
    ]),
    "dtstart": startDateTime.toZonedDateTime("America/New_York").toString(),
    "dtend": endDateTime.toZonedDateTime("America/New_York").toString(),
    "organizer": { "id": organizer.id, "name": organizer.name },
    "rsvps": rsvps,
  };
}

async function main() {
  const flags = parseArgs(Deno.args, {
    alias: { data: "d", media: "m" },
    string: ["data", "media"],
    default: {
      data: null,
      media: null,
    },
  });

  if (flags.data === null) {
    console.error("-d, --data must be defined");
    Deno.exit(1);
  }
  if (flags.media === null) {
    console.error("-m, --media must be defined");
    Deno.exit(1);
  }

  const usersMap: Record<string, User> = {};
  const events: Event[] = [];

  const userPartials: UserWithoutProfilePictureOrMe[] = [];

  for (let i = 0; i < N_RANDOM_USERS; i++) {
    const partial = randomUser();
    userPartials.push(partial);
  }

  async function fetchProfilePicture(
    partial: UserWithoutProfilePictureOrMe,
  ): Promise<UserWithoutMe> {
    assert(flags.media !== null);

    const profilePicture = await randomUserProfilePicture(flags.media);
    return { ...partial, profilePicture };
  }

  const usersWithoutMe = await Promise.all(
    userPartials.map((partial) => fetchProfilePicture(partial)),
  );

  const meIndex = faker.number.int({ min: 0, max: usersWithoutMe.length - 1 });
  const users = usersWithoutMe.map(
    (userWithoutMe: UserWithoutMe, index: number): User => {
      return { ...userWithoutMe, me: index === meIndex };
    },
  );

  for (const user of users) {
    usersMap[user.id] = user;
  }

  for (let i = 0; i < N_RANDOM_EVENTS; i++) {
    const event = randomEvent(usersMap);
    events.push(event);
  }

  const ser = JSON.stringify({ users: Object.values(usersMap), events });
  await Deno.writeTextFile(flags.data, ser);
}

await main();
