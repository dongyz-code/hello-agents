import {
  getExecutorPromptTemplate,
  getPlannerPromptTemplate,
} from "./prompt.js";
import { HelloAgentsLLM, type Message } from "./utils/openai.js";

class Planner {
  constructor(private llmClient: HelloAgentsLLM) {}

  async plan(question: string) {
    const prompt = getPlannerPromptTemplate(question);
    const messages: Message[] = [{ role: "user", content: prompt }];

    console.log(`计划正在生成`);
    const response = await this.llmClient.think({ messages, temperature: 0.7 });
    console.log(`计划已生成 : ${response}`);

    return this.parsePlans(response || "");
  }

  parsePlans(text: string) {
    const match = text.match(/```ts\n([\s\S]*?)\n```/);
    if (!match?.[1]) return [];

    const planStr = match[1].trim();

    try {
      const plans = JSON.parse(planStr);
      return plans as string[];
    } catch (e) {
      console.log(e);
      return [];
    }
  }
}

class Executor {
  constructor(private llmClient: HelloAgentsLLM) {}

  async executor(question: string, plans: string[]) {
    let history = "";
    let responseStr = "";
    console.log(`\n ---------正在执行计划--------`);

    for (let i = 0; i < plans.length; i++) {
      const currentStep = plans[i];
      const stepIndex = i + 1;
      console.log(`\n -> 执行计划步骤 {${stepIndex}: ${currentStep}`);

      const prompt = getExecutorPromptTemplate({
        question,
        plan: plans.join(`\n`),
        current_step: currentStep,
        history: history ? history : "无",
      });

      const messages: Message[] = [{ role: "user", content: prompt }];

      const response = await this.llmClient.think({
        messages,
        temperature: 0.7,
      });

      responseStr = response || "";

      history += `步骤${stepIndex}: ${currentStep}\n 结果: ${responseStr}`;

      console.log(`✅ 步骤 ${stepIndex} 已完成，结果: ${responseStr}`);
    }

    return responseStr;
  }
}

export class PlanAndSolveAgent {
  private planner: Planner;
  private executor: Executor;

  constructor(llmClient: HelloAgentsLLM) {
    this.planner = new Planner(llmClient);
    this.executor = new Executor(llmClient);
  }

  async run(question: string) {
    console.log(`开始处理问题-- ${question}`);

    const plan = await this.planner.plan(question);

    if (!plan?.length) {
      console.log(`任务终止，无法升成有效的计划`);
      return;
    }

    const result = await this.executor.executor(question, plan);

    console.log(`任务完成，结果${result}`);
  }
}

// -------------test-------------------

const llmClient = new HelloAgentsLLM();
const planAndSolveAgent = new PlanAndSolveAgent(llmClient);

planAndSolveAgent
  .run(
    `问题: 一个水果店周一卖出了15个苹果。周二卖出的苹果数量是周一的两倍。周三卖出的数量比周二少了5个。请问这三天总共卖出了多少个苹果？`,
  )
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
