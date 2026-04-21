import type { ClientOptions } from "openai";

import { OpenAI } from "openai";
import { DOUBAO_MODEL_ID, getAiConfig } from "@/config/index.js";

export class HelloAgentsLLM {
  private client: OpenAI;
  private modelId = DOUBAO_MODEL_ID;

  constructor(option?: Partial<ClientOptions>) {
    const defaultConf = getAiConfig();
    const baseURL = option?.baseURL ?? defaultConf.apiBase;
    const apiKey = option?.apiKey ?? defaultConf.apiKey;
    const timeout = option?.timeout ?? 60_000;

    this.client = new OpenAI({
      ...option,
      baseURL,
      apiKey,
      timeout,
    });
  }

  async think(options: {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    temperature: number;
  }) {
    console.log(`正在调用${this.modelId}模型`);
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        stream: true,
        ...options,
      });

      console.log("✅ 大语言模型响应成功:");
      let collectedContent = "";
      for await (const chunk of response) {
        const content = chunk.choices?.[0]?.delta.content ?? "";
        process.stdout.write(content);
        collectedContent += content;
      }
      console.log(); // 换行
      return collectedContent;
    } catch (e) {
      console.error(`❌ 调用LLM API时发生错误: ${e}`);
      return null;
    }
  }
}
