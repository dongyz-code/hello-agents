import type OpenAI from "openai";
import { getReActPromptTemplate } from "./prompt.js";
import { HelloAgentsLLM } from "./utils/openai.js";
import { search, ToolExecutor } from "./utils/tools.js";

export class ReActAgent {
  private history: string[] = [];

  constructor(
    private llmClient: HelloAgentsLLM,
    private toolExecutor: ToolExecutor,
    private maxSteps: number = 5,
  ) {}

  async run(question: string) {
    this.history = [];
    let currentStep = 0;

    while (currentStep < this.maxSteps) {
      currentStep += 1;
      console.log(`------第${currentStep}步-----`);

      // 1. 格式化提示词
      const toolsDesc = this.toolExecutor.getAvailableTools();
      const historyStr = this.history.join("/n");
      const prompt = getReActPromptTemplate({
        tools: toolsDesc,
        question,
        history: historyStr,
      });
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "user", content: prompt },
      ];

      console.log(messages);
      const response = await this.llmClient.think({
        messages,
        temperature: 0.7,
      });

      if (!response) {
        console.log(`错误：LLM未能返回有效响应`);
        break;
      }

      const { thought, action } = this.parseOutput(response);

      if (thought) {
        console.log(`思考： ${thought}`);
      }

      if (!action) {
        console.warn(`警告： 未能解析出有效的Action，流程终止`);
        break;
      }

      // 最终答案
      if (action.startsWith("Finish")) {
        const match = action.match(/Finish\[(.*)\]/);
        const answer = match ? match[1] : undefined;
        console.log(answer);
        return answer;
      }

      const { tool, input } = this.parseAction(action);
      if (!tool || !input) {
        continue;
      }

      const func = this.toolExecutor.getTool(tool);
      let observation: string;
      if (!func) {
        observation = `错误： 未找到名为 ${tool} 的工具`;
      } else {
        observation = await func.func(input);
      }
      this.history.push(`Action: ${action}`);
      this.history.push(`Observation: ${observation}`);
    }
  }

  /**
   * 解析LLM的返回值，提取Thought 和 Action
   */
  private parseOutput(text: string) {
    // Thought: 匹配到 Action: 或文本末尾
    const thoughtMatch = text.match(/Thought:\s*(.*?)(?=\nAction:|$)/s);
    // Action: 匹配到文本末尾
    const actionMatch = text.match(/Action:\s*(.*?)$/s);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : null;
    const action = actionMatch ? actionMatch[1].trim() : null;

    return { thought, action };
  }

  /**
   * 解析Action字符串， 提取工具名称和输入
   */
  private parseAction(actionText: string) {
    const match = actionText.match(/(\w+)\[(.*)\]/s);
    if (match) {
      return {
        tool: match[1],
        input: match[2],
      };
    }
    return { tool: null, input: null };
  }
}

// const helloAgentsLLM = new HelloAgentsLLM();
// const toolExecutor = new ToolExecutor();
// toolExecutor.registerTool({
//   name: "Search",
//   description:
//     "一个网页搜索引擎。当你需要回答关于时事、事实以及在你的知识库中找不到的信息时，应使用此工具。",
//   func: search,
// });
// const reActAgent = new ReActAgent(helloAgentsLLM, toolExecutor);

// reActAgent.run(`华为最新手机型号及主要卖点`);
