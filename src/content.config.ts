import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const programs = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/programs" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    division: z.enum([
      "fine-arts",
      "design",
      "architecture",
      "humanities-sciences",
      "writing",
    ]),
    degreeTypes: z.array(
      z.enum([
        "BFA",
        "BA",
        "MFA",
        "MA",
        "MBA",
        "MArch",
        "MDes",
        "MDesign",
        "BArch",
      ]),
    ),
    description: z.string(),
    url: z.string(),
  }),
});

const students = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/students" }),
  schema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    slug: z.string(),
    pronouns: z.string().optional(),
    photo: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    program: reference("programs"),
    degreeLevel: z.enum(["undergraduate", "graduate"]),
    degreeType: z.enum([
      "BFA",
      "BA",
      "MFA",
      "MA",
      "MBA",
      "MArch",
      "MDes",
      "MDesign",
      "BArch",
    ]),
    expectedGraduation: z.string(),
    bio: z.string().optional(),
    artistStatement: z.string().optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
          type: z.string(),
        }),
      )
      .optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/events" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    shortTitle: z.string(),
    type: z.enum(["commencement", "showcase", "thesis-exhibition"]),
    degreeLevel: z.enum(["undergraduate", "graduate", "all"]),
    themeKey: z.string(),
    date: z.string(),
    endDate: z.string().optional(),
    time: z.string(),
    location: z.string(),
    address: z.string(),
    description: z.string(),
    longDescription: z.string().optional(),
    rsvpUrl: z.string().optional(),
    livestreamUrl: z.string().optional(),
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    order: z.number(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/works" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    students: z.array(reference("students")),
    events: z.array(reference("events")),
    medium: z.string().optional(),
    dimensions: z.string().optional(),
    year: z.number(),
    description: z.string().optional(),
    artistStatement: z.string().optional(),
    media: z.array(
      z.object({
        type: z.enum(["image", "video", "audio", "embed"]),
        src: z.string(),
        alt: z.string().optional(),
        thumbnail: z.string().optional(),
        caption: z.string().optional(),
      }),
    ),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
});

export const collections = { programs, students, events, works };
