import { tavily } from "@tavily/core";

import { getEnv } from "../../config/env.js";

export async function getAttraction(
  city: string,
  weather: string,
): Promise<string> {
  // 1. 读取环境变量
  let apiKey: string;

  try {
    ({ TAVILY_API_KEY: apiKey } = getEnv());
  } catch {
    return "错误: 未配置 TAVILY_API_KEY 环境变量。";
  }

  // 2. 初始化客户端
  const client = tavily({ apiKey });

  // 3. 构造查询
  const query = `'${city}' 在'${weather}'天气下最值得去的旅游景点推荐及理由`;

  try {
    // 4. 调用 API
    const response = await client.search(query, {
      searchDepth: "basic",
      includeAnswer: true,
    });

    // 5. 优先返回总结答案
    if (response.answer) {
      return response.answer;
    }

    // fallback：格式化 results
    const formattedResults = (response.results || []).map((result: any) => {
      return `- ${result.title}: ${result.content}`;
    });

    if (formattedResults.length === 0) {
      return "抱歉，没有找到相关的旅游景点推荐。";
    }

    return "根据搜索，为您找到以下信息:\n" + formattedResults.join("\n");
  } catch (error: any) {
    return `错误: 执行 Tavily 搜索时出现问题 - ${error.message}`;
  }
}
