import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText } from "ai";
import { DOUBAO_MODEL_ID, getEnv } from "@/config/index.js";
import { getEmbedding } from "./embedding.js";
import type { RAGConfig, SearchResult } from "./types.js";
import type { VectorStore } from "./vector-store.js";

const { AI_API_BASE, AI_API_KEY } = getEnv();

const provider = createOpenAICompatible({
  name: "doubao",
  baseURL: AI_API_BASE,
  apiKey: AI_API_KEY,
});

const chatModel = provider.chatModel(DOUBAO_MODEL_ID);

export class RAGEngine {
  private vectorStore: VectorStore;
  private config: RAGConfig;

  constructor(vectorStore: VectorStore, config: RAGConfig) {
    this.vectorStore = vectorStore;
    this.config = config;
  }

  // MQE: 多查询扩展
  private async expandQueries(question: string): Promise<string[]> {
    const { text } = await generateText({
      model: chatModel,
      prompt: `为以下问题生成 3 个语义等价但表述不同的查询，用于信息检索。只返回 JSON 数组，不要其他内容。
问题：${question}
输出格式：["查询1", "查询2", "查询3"]`,
    });

    try {
      // 尝试解析 JSON
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch {
      // 如果解析失败，返回原始问题
      return [question];
    }
  }

  // HyDE: 假设文档嵌入
  private async generateHypotheticalAnswer(question: string): Promise<string> {
    const { text } = await generateText({
      model: chatModel,
      prompt: `请为以下问题生成一个假设性的答案段落，用于检索相关文档。假设答案不需要完全准确，但要包含可能相关的关键概念和描述。
问题：${question}`,
    });
    return text;
  }

  // 基础向量检索
  private async vectorSearch(query: string): Promise<SearchResult[]> {
    const embedding = await getEmbedding(query);
    return this.vectorStore.search(embedding, this.config.topK);
  }

  // MQE 检索
  private async mqeSearch(question: string): Promise<SearchResult[]> {
    const queries = await this.expandQueries(question);
    const allResults = await Promise.all(
      queries.map((q) => this.vectorSearch(q)),
    );

    // 合并结果，去重，按相似度排序
    const merged = new Map<string, SearchResult>();
    for (const results of allResults) {
      for (const result of results) {
        if (!merged.has(result.id)) {
          merged.set(result.id, result);
        } else {
          // 取更高的相似度
          const existing = merged.get(result.id)!;
          if (result.score > existing.score) {
            merged.set(result.id, result);
          }
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }

  // HyDE 检索
  private async hydeSearch(question: string): Promise<SearchResult[]> {
    const hypotheticalAnswer = await this.generateHypotheticalAnswer(question);
    return this.vectorSearch(hypotheticalAnswer);
  }

  // 组合检索（MQE + HyDE）
  private async combinedSearch(question: string): Promise<SearchResult[]> {
    const mqeResults = await this.mqeSearch(question);
    const hydeResults = await this.hydeSearch(question);

    // 合并两种检索结果
    const merged = new Map<string, SearchResult>();
    for (const result of [...mqeResults, ...hydeResults]) {
      if (!merged.has(result.id)) {
        merged.set(result.id, result);
      } else {
        const existing = merged.get(result.id)!;
        if (result.score > existing.score) {
          merged.set(result.id, result);
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }

  // 获取检索结果
  async retrieve(question: string): Promise<SearchResult[]> {
    if (this.config.enableMQE && this.config.enableHyDE) {
      return this.combinedSearch(question);
    }
    if (this.config.enableMQE) {
      return this.mqeSearch(question);
    }
    if (this.config.enableHyDE) {
      return this.hydeSearch(question);
    }
    return this.vectorSearch(question);
  }

  // 流式生成回答
  async chat(question: string) {
    const contexts = await this.retrieve(question);

    const contextText = contexts
      .map(
        (c) => `[相关文档片段]\n${c.content}\n[相似度: ${c.score.toFixed(2)}]`,
      )
      .join("\n\n");

    const systemPrompt = `你是一个智能文档问答助手。请基于以下检索到的文档片段回答用户问题。

文档上下文：
${contextText}

回答要求：
1. 优先使用文档中的信息回答
2. 如果文档中没有相关信息，请明确告知用户
3. 回答要简洁准确
4. 可以引用文档片段`;

    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      prompt: question,
    });

    return {
      stream: result.textStream,
      contexts,
    };
  }
}

export function createRAGEngine(
  vectorStore: VectorStore,
  config: RAGConfig,
): RAGEngine {
  return new RAGEngine(vectorStore, config);
}
