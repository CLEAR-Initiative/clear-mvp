import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { FEATURE_FLAGS, getDefaultFlags } from "~/lib/constants/feature-flags";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const FLAGS_FILE = join(process.cwd(), "data", "feature-flags.json");

async function readFlags(): Promise<Record<string, boolean>> {
  try {
    const raw = await readFile(FLAGS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // File doesn't exist or is corrupt — initialize from defaults
    const defaults = getDefaultFlags();
    await mkdir(join(process.cwd(), "data"), { recursive: true });
    await writeFile(FLAGS_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

async function writeFlags(flags: Record<string, boolean>): Promise<void> {
  await writeFile(FLAGS_FILE, JSON.stringify(flags, null, 2) + "\n");
}

export const featureFlagsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const flags = await readFlags();

    return FEATURE_FLAGS.map((def) => ({
      ...def,
      enabled: flags[def.key] ?? def.defaultEnabled,
    }));
  }),

  toggle: publicProcedure
    .input(
      z.object({
        key: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const flags = await readFlags();
      flags[input.key] = input.enabled;
      await writeFlags(flags);
      return { key: input.key, enabled: input.enabled };
    }),
});
