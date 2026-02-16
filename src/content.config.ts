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
        "MAAD",
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
      "MAAD",
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
    ceremonies: z.array(reference("events")).optional(),
    newsroomStories: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          date: z.string().optional(),
          summary: z.string().optional(),
          listingTitle: z.string().optional(),
          image: z
            .object({
              src: z.string(),
              alt: z.string(),
            })
            .optional(),
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
    type: z.enum(["commencement", "showcase", "thesis-exhibition", "celebration"]),
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
    schedule: z
      .array(
        z.object({
          time: z.string(),
          label: z.string(),
        }),
      )
      .optional(),
    ceremonyProgram: z
      .object({
        studentSpeaker: z
          .object({
            student: reference("students").optional(),
            name: z.string(),
            program: z.string(),
            speechHighlights: z.string().optional(),
          })
          .optional(),
        distinguishedAlumni: reference("people").optional(),
        candidatesListUrl: z.string().optional(),
      })
      .optional(),
    videoUrl: z.string().optional(),
    videoCaption: z.string().optional(),
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

const people = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/people" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    role: z.enum([
      "honorary-doctorate",
      "professor-emeritus",
      "distinguished-alumni",
      "other",
    ]),
    photo: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    title: z.string().optional(),
    bio: z.string().optional(),
    ccaConnection: z.string().optional(),
    ceremony: reference("events").optional(),
    order: z.number().optional(),
  }),
});

const commencementInfo = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/commencement-info" }),
  schema: z.object({
    year: z.number(),
    commencementNumber: z.string(),
    contact: z.object({
      email: z.string(),
      phone: z.string().optional(),
    }),
    forStudents: z.object({
      heading: z.string(),
      summary: z.string(),
      content: z.string(),
    }),
    forFamilies: z.object({
      heading: z.string(),
      summary: z.string(),
      content: z.string(),
    }),
  }),
});

const recap = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/recap" }),
  schema: z.object({
    year: z.number(),
    commencementNumber: z.string(),
    heroImage: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),
    videoUrl: z.string().optional(),
    videoCaption: z.string().optional(),
    presidentQuote: z.object({
      text: z.string(),
      attribution: z.string(),
    }),
    statistics: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        detail: z.string().optional(),
      }),
    ),
    downloadableAssets: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
          description: z.string().optional(),
        }),
      )
      .optional(),
    inMemoriam: z.array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        years: z.string().optional(),
      }),
    ),
    ceremonies: z.array(
      z.object({
        event: reference("events"),
        studentSpeaker: z.object({
          name: z.string(),
          program: z.string(),
          speechHighlights: z.string().optional(),
        }),
        distinguishedAlumni: reference("people").optional(),
        candidatesListUrl: z.string().optional(),
      }),
    ),
  }),
});

export const collections = {
  programs,
  students,
  events,
  works,
  people,
  "commencement-info": commencementInfo,
  recap,
};
