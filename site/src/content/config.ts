import { defineCollection, z } from "astro:content";

const docs = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(["overview", "methodology", "commands"]),
    order: z.number().default(99),
    lang: z.enum(["en", "es"]),
  }),
});

export const collections = { docs };
