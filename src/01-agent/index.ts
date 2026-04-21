import { stepCountIs, tool } from "ai";
import { z } from "zod";

import { DOUBAO_MODEL_ID, generateTextByModel } from "../config/ai-model.js";
import { getAttraction, getWeather } from "./utils/index.js";
import { run } from "../utils/run.js";

const tools = {
  getWeather: tool({
    description: "获取城市天气",
    inputSchema: z.object({
      city: z.string().trim().min(1).describe("要查询天气的城市"),
    }),
    execute: async ({ city }) => {
      return getWeather(city);
    },
  }),
  getAttraction: tool({
    description: "根据天气推荐景点",
    inputSchema: z.object({
      city: z.string().trim().min(1).describe("目标城市"),
      weather: z.string().trim().min(1).describe("当前天气描述"),
    }),
    execute: async ({ city, weather }) => {
      return getAttraction(city, weather);
    },
  }),
};

export async function runAgent(userInput: string): Promise<string> {
  const result = await generateTextByModel({
    name: "doubao",
    model_id: DOUBAO_MODEL_ID,
    system:
      "你是一个旅游助手。需要时优先调用工具获取天气和景点信息，再给用户简洁、直接的建议。",
    prompt: userInput,
    tools,
    stopWhen: stepCountIs(5),
  });

  console.log(result.text);
  return result.text;
}

runAgent(
  "你好，请帮我查询一下今天北京的天气，然后根据天气推荐一个合适的旅游景点。",
);
