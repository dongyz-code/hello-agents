import { getJson } from "serpapi";
import { getEnv } from "@/config/index.js";

export interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: string;
    processed_at: string;
    google_url: string;
    raw_html_file: string;
    total_time_taken: number;
  };

  search_parameters: {
    engine: string;
    q: string;
    location_requested?: string;
    location_used?: string;
    google_domain?: string;
    hl?: string;
    gl?: string;
  };

  search_information: {
    query_displayed: string;
    total_results?: number;
    time_taken_displayed?: number;
  };

  // ✅ 直接答案（AI/Agent最常用）
  answer_box?: {
    type?: string;
    title?: string;
    answer?: string;
    snippet?: string;
    highlighted_words?: string[];
    link?: string;
    display_link?: string;
  };

  // 有时存在
  answer_box_list?: string[];

  // ✅ 知识图谱
  knowledge_graph?: {
    title: string;
    type?: string;
    description?: string;
    source?: {
      name: string;
      link: string;
    };
    attributes?: Record<string, string>;
  };

  // ✅ 自然搜索结果（最稳定）
  organic_results?: {
    position: number;
    title: string;
    link: string;
    snippet?: string;
    displayed_link?: string;
    date?: string;
    cached_page_link?: string;
    related_pages_link?: string;
    source?: string;
  }[];

  // People also ask
  related_questions?: {
    question: string;
    snippet?: string;
    link?: string;
  }[];

  // 相关搜索
  related_searches?: {
    query: string;
    link: string;
  }[];

  // Top stories（新闻）
  top_stories?: {
    title: string;
    link: string;
    source: string;
    date: string;
    thumbnail?: string;
  }[];

  // 视频
  video_results?: {
    title: string;
    link: string;
    duration?: string;
    thumbnail?: string;
    source?: string;
  }[];

  // 图片
  images_results?: {
    title: string;
    link: string;
    original?: string;
    thumbnail?: string;
  }[];

  // 本地结果（地图）
  local_results?: {
    places: {
      position: number;
      title: string;
      address?: string;
      rating?: number;
      reviews?: number;
      phone?: string;
      link?: string;
    }[];
  };

  // 错误
  error?: string;
}

export type ToolItem = {
  description: string;
  func: (...args: any) => any;
};

/**
 * 一个基于SerpApi的实战网页搜索引擎工具。
 * 它会智能地解析搜索结果，优先返回直接答案或知识图谱信息。
 */
export async function search(query: string) {
  try {
    console.log(`🔍 正在执行 [SerpApi] 网页搜索: ${query}`);
    const { SERPAPI_API_KEY } = getEnv();
    const response = (await getJson({
      engine: "google",
      api_key: SERPAPI_API_KEY,
      q: query,
      location: "Austin, Texas",
      hl: "zh-cn",
      gl: "cn",
    })) as SerpApiResponse;

    // 优先用 answer_box_list
    if ("answer_box_list" in response) {
      return response.answer_box_list?.join("\n") || "";
    }

    if ("answer_box" in response) {
      return response.answer_box?.answer || response.answer_box?.snippet || "";
    }

    if (response.organic_results?.length) {
      return response.organic_results
        .slice(0, 5)
        .map(
          (item, i) =>
            `${i + 1}. ${item.title}\n${item.snippet ?? ""}\n${item.link}`,
        )
        .join("\n\n");
    }

    return "未找到相关结果";
  } catch (e) {
    console.error("❌ 搜索失败:", e);
    return "搜索失败";
  }
}

export class ToolExecutor {
  private toolMap = new Map<string, ToolItem>();

  /**
   *  向工具箱中注册一个新工具。
   */
  registerTool(
    tool: ToolItem & {
      name: string;
    },
  ) {
    const { name, ...item } = tool;
    if (this.toolMap.has(name)) {
      console.warn(`${name} 已存在，将被覆盖`);
    }

    this.toolMap.set(name, item);
  }

  /**
   * 获取一个工具
   */
  getTool(name: string) {
    return this.toolMap.get(name);
  }

  /**
   * 获取所有可用工具的格式化描述字符串。
   */
  getAvailableTools() {
    return Array.from(this.toolMap)
      .map(([name, value]) => {
        return `-${name}: ${value.description}`;
      })
      .join("\n");
  }
}
