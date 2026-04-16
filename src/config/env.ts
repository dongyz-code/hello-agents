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

const optionalNonEmptyString = z.string().trim().min(1).optional();
const optionalUrl = z.url().optional();

const rawEnvSchema = z.object({
  AI_API_KEY: optionalNonEmptyString,
  AI_API_BASE: optionalUrl,
  AP_API_BASE: optionalUrl,
  TAVILY_API_KEY: optionalNonEmptyString,
});

const rawEnv = rawEnvSchema.parse(process.env);

export const env = {
  AI_API_KEY: rawEnv.AI_API_KEY,
  AI_API_BASE: rawEnv.AI_API_BASE ?? rawEnv.AP_API_BASE,
  TAVILY_API_KEY: rawEnv.TAVILY_API_KEY,
};

export type Env = typeof env;

function requireEnvValue(
  key: keyof Env,
  value: string | undefined,
  message: string,
): string {
  if (!value) {
    throw new Error(`${message}，请在 .env 中配置 ${key}`);
  }

  return value;
}

export function getAiConfig() {
  return {
    apiKey: requireEnvValue("AI_API_KEY", env.AI_API_KEY, "缺少 AI API Key"),
    apiBase: requireEnvValue(
      "AI_API_BASE",
      env.AI_API_BASE,
      "缺少 AI API Base",
    ),
  };
}

export function getTavilyConfig() {
  return {
    apiKey: requireEnvValue(
      "TAVILY_API_KEY",
      env.TAVILY_API_KEY,
      "缺少 Tavily API Key",
    ),
  };
}
