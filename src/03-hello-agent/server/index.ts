import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { processDocument } from "../lib/document.js";
import { getEmbeddings } from "../lib/embedding.js";
import { MemoryStore } from "../lib/memory.js";
import { RAGEngine } from "../lib/rag.js";
import type { RAGConfig, StatsResponse, UploadResponse } from "../lib/types.js";
import { VectorStore } from "../lib/vector-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer({ dest: "uploads/" });

// 配置
const config: RAGConfig = {
  collectionName: "documents",
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 5,
  enableMQE: true,
  enableHyDE: true,
};

// 初始化
let vectorStore: VectorStore;
let ragEngine: RAGEngine;
let memoryStore: MemoryStore;

// 统计数据
const stats = {
  sessionStart: Date.now(),
  documentsLoaded: 0,
  questionsAsked: 0,
  notesCount: 0,
};

async function initialize() {
  vectorStore = new VectorStore(config.collectionName);
  await vectorStore.initCollection();

  ragEngine = new RAGEngine(vectorStore, config);
  memoryStore = new MemoryStore("default");

  console.log("✅ 系统初始化完成");
}

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API 路由

// 上传文档
app.post<"/api/upload", {}, UploadResponse>(
  "/api/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.json({ success: false, message: "没有上传文件" });
      }

      const filePath = req.file.path;
      const { chunks, documentName } = await processDocument(filePath, {
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
      });

      // 获取 embeddings
      const embeddings = await getEmbeddings(chunks.map((c) => c.content));

      // 存储到向量数据库
      await vectorStore.addVectors(embeddings, chunks);

      // 记录到记忆
      memoryStore.add(
        `加载了文档《${documentName}》，共 ${chunks.length} 个片段`,
        "episodic",
        0.9,
        { event: "document_loaded", documentName },
      );

      stats.documentsLoaded++;

      res.json({
        success: true,
        message: `文档加载成功，共处理 ${chunks.length} 个片段`,
        documentName,
        chunksCount: chunks.length,
      });
    } catch (error: unknown) {
      console.error("文档处理错误:", error);
      res.json({
        success: false,
        message: `处理失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  },
);

// RAG 问答（流式）
app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "问题不能为空" });
    }

    // 记录问题到记忆
    memoryStore.add(`用户提问: ${question}`, "working", 0.6);

    // RAG 问答
    const { stream, contexts } = await ragEngine.chat(question);

    // 设置 SSE 头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 流式发送
    for await (const text of stream) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    // 发送上下文信息
    res.write(`data: ${JSON.stringify({ contexts, done: true })}\n\n`);

    // 记录问答到情景记忆
    stats.questionsAsked++;

    res.end();
  } catch (error: unknown) {
    console.error("问答错误:", error);
    res.status(500).json({
      error: `问答失败: ${error instanceof Error ? error.message : "未知错误"}`,
    });
  }
});

// 记忆管理
app.post("/api/memory", async (req, res) => {
  try {
    const { action, content, type, importance } = req.body;

    if (action === "add") {
      const memory = memoryStore.add(content, type, importance);
      if (type === "semantic") {
        stats.notesCount++;
      }
      res.json({ success: true, data: memory });
    } else if (action === "search") {
      const { query, limit } = req.body;
      const results = memoryStore.search(query, limit || 10);
      res.json({ success: true, data: results });
    } else if (action === "list") {
      const memories = memoryStore.getAll();
      res.json({ success: true, data: memories });
    } else if (action === "stats") {
      const memoryStats = memoryStore.getStats();
      res.json({ success: true, data: memoryStats });
    } else {
      res.json({ success: false, message: "未知的操作" });
    }
  } catch (error: unknown) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    });
  }
});

// 获取统计
app.get<"/api/stats", {}, StatsResponse>("/api/stats", async (req, res) => {
  const vectorStats = await vectorStore.getStats();
  const memoryStats = memoryStore.getStats();

  res.json({
    sessionStart: stats.sessionStart,
    documentsLoaded: stats.documentsLoaded,
    questionsAsked: stats.questionsAsked,
    notesCount: stats.notesCount,
    ...vectorStats,
    ...memoryStats,
  });
});

// 启动服务器
const PORT = 3000;

initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 服务器启动成功: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("初始化失败:", error);
    process.exit(1);
  });
