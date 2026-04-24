import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const projectRoot = resolve(currentDir, "../..");

loadEnv({
  path: resolve(projectRoot, ".env"),
});

const envSchema = z.object({
  AI_API_KEY: z.string().trim().min(1),
  AI_API_BASE: z.url(),
  TAVILY_API_KEY: z.string().trim().min(1),
  SERPAPI_API_KEY: z.string().trim().min(1),
});

export function getEnv() {
  const env = envSchema.parse(process.env);
  return env;
}

export type Env = z.infer<typeof envSchema>;

