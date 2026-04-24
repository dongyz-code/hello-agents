import {
  createOpenAICompatible,
  type OpenAICompatibleProvider,
} from "@ai-sdk/openai-compatible";
import { generateText, type LanguageModel, type ModelMessage } from "ai";

import { getEnv } from "./env.js";

type DoubaoProvider = OpenAICompatibleProvider;
type ProviderFactory = () => OpenAICompatibleProvider;
type GenerateTextOptions = Parameters<typeof generateText>[0];
type ChatModel = LanguageModel;

export const DOUBAO_MODEL_ID = "doubao-seed-2-0-pro-260215";

const providerRegistry = {
  doubao: {
    createProvider: (): DoubaoProvider => {
      const { AI_API_BASE: apiBase, AI_API_KEY: apiKey } = getEnv();

      return createOpenAICompatible({
        name: "doubao",
        baseURL: apiBase,
        apiKey,
      });
    },
  },
} as const satisfies Record<string, { createProvider: ProviderFactory }>;

export type AiProviderName = keyof typeof providerRegistry;

export interface ChatModelSelector {
  name: string;
  model_id: string;
}

type GenerateTextBaseOptions = Omit<
  GenerateTextOptions,
  "model" | "prompt" | "messages"
> &
  ChatModelSelector;

type GenerateTextWithPromptOptions = GenerateTextBaseOptions & {
  prompt: string | ModelMessage[];
  messages?: never;
};

type GenerateTextWithMessagesOptions = GenerateTextBaseOptions & {
  messages: ModelMessage[];
  prompt?: never;
};

export type GenerateTextByModelOptions =
  | GenerateTextWithPromptOptions
  | GenerateTextWithMessagesOptions;

function isAiProviderName(name: string): name is AiProviderName {
  return name in providerRegistry;
}

function getProvider(name: string): OpenAICompatibleProvider {
  if (!isAiProviderName(name)) {
    const supportedProviders = Object.keys(providerRegistry).join(", ");

    throw new Error(
      `不支持的 AI provider: ${name}。当前可用 provider: ${supportedProviders}`,
    );
  }

  return providerRegistry[name].createProvider();
}

export function getDoubaoProvider(): DoubaoProvider {
  return getProvider("doubao");
}

export function getDoubaoModel(): ChatModel {
  return getChatModel({
    name: "doubao",
    model_id: DOUBAO_MODEL_ID,
  });
}

export function getChatModel({
  name,
  model_id,
}: ChatModelSelector): ChatModel {
  return getProvider(name).chatModel(model_id);
}

export function generateTextByModel({
  name,
  model_id,
  ...options
}: GenerateTextByModelOptions): ReturnType<typeof generateText> {
  const model = getChatModel({ name, model_id });

  if ("messages" in options) {
    return generateText({
      ...options,
      model,
    });
  }

  return generateText({
    ...options,
    model,
  });
}
