import {
  getInitPromptTemplate,
  getRefinementPromptTemplate,
  getReflectionPromptTemplate,
} from "./prompt.js";
import { HelloAgentsLLM, Message } from "./utils/openai.js";

type RecordType = "execution" | "reflection";

class Memory {
  private records: {
    type: RecordType;
    content: string;
  }[] = [];

  /**
   * 向记忆中添加一条新的记录
   */
  addRecords(recordType: RecordType, content: string) {
    this.records.push({
      type: recordType,
      content: content,
    });
    console.log(`📝 记忆已更新，新增一条 '${recordType}' 记录。`);
  }

  /**
   * 将所有记忆格式化一个连贯的字符串文本
   */
  getTrajectory() {
    const list: string[] = [];

    for (const record of this.records) {
      if (record.type === "execution") {
        list.push(`--- 上一轮尝试(代码) --- \n ${record.content}`);
      } else if (record.type === "reflection") {
        list.push(`--- 评审员反馈 --- \n ${record.content}`);
      }
    }

    return list.join("\n");
  }

  /**
   * 获取最近一次的执行结果
   */
  getLatestExecution() {
    for (const record of this.records) {
      if (record.type === "execution") {
        return record.content;
      }
    }

    return null;
  }
}

class ReflectionAgent {
  private memory: Memory;
  constructor(
    private llmClient: HelloAgentsLLM,
    private maxIterations = 3,
  ) {
    this.memory = new Memory();
  }

  async getLlmResponse(content: string) {
    const messages: Message[] = [{ role: "user", content }];
    return this.llmClient.think({ messages, temperature: 0.7 });
  }

  async run(task: string) {
    console.log(`----- 开始处理任务----  \n 任务: ${task}`);

    console.log(`---- 正在进行初次尝试----`);

    const initPrompt = getInitPromptTemplate(task);
    const initCode = await this.getLlmResponse(initPrompt);
    this.memory.addRecords("execution", initCode || "");

    for (let i = 0; i < this.maxIterations; i++) {
      console.log(`第${i + 1}迭代`);
      console.log(`----- 反思 -----`);
      const lastCode = this.memory.getLatestExecution() || "";
      const reflecPrompt = getReflectionPromptTemplate(task, lastCode);
      const feedback = await this.getLlmResponse(reflecPrompt);

      if (feedback?.includes("无需改进")) {
        console.log(`✅ 反思认为代码已无需改进，任务完成。`);
        break;
      }

      console.log(`---- 正在进行优化-------`);
      const refinePrompt = getRefinementPromptTemplate({
        task,
        feedback: feedback || "",
        last_code_attempt: lastCode || "",
      });
      const refineCode = await this.getLlmResponse(refinePrompt);
      this.memory.addRecords("execution", refineCode || "");
    }

    const finialCode = this.memory.getLatestExecution();
    console.log(`最终代码： ${finialCode}`);
    return finialCode;
  }
}

const reflectionAgent = new ReflectionAgent(new HelloAgentsLLM());
reflectionAgent.run(`任务： 编写一个Python函数，找出1到n之间所有的素数 (prime numbers)。`)
