# 智能文档问答助手

基于 Vercel AI SDK + Qdrant 的 RAG 问答系统，支持 MQE 和 HyDE 高级检索。

## 功能

1. **智能文档处理**：PDF 解析、文本分块、向量化存储
2. **高级检索问答**：MQE（多查询扩展）+ HyDE（假设文档嵌入）
3. **多层次记忆管理**：工作记忆、情景记忆、语义记忆
4. **学习统计**：文档数量、问答次数、笔记统计

## 技术栈

- **后端**：Express + Vercel AI SDK (`ai` 包)
- **向量数据库**：Qdrant
- **Embedding**：Doubao API
- **前端**：纯 HTML + JS

## 文件结构

```
src/03-hello-agent/
├── lib/                # 核心模块
│   ├── types.ts        # 类型定义
│   ├── document.ts     # PDF 解析和分块
│   ├── embedding.ts    # Embedding 服务
│   ├── vector-store.ts # Qdrant 向量存储
│   ├── rag.ts          # RAG 核心（MQE/HyDE）
│   └── memory.ts       # 记忆系统
├── server/             # 服务端
│   └── index.ts        # Express 服务入口
├── public/             # 前端
│   ├── index.html      # 页面
│   ├── app.js          # 逻辑
│   └── style.css       # 样式
└── readme.md           # 说明文档
```

## 启动步骤

### 1. 启动 Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. 启动后端

```bash
tsx src/03-hello-agent/server/index.ts
```

### 3. 打开浏览器

访问 http://localhost:3000

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传 PDF 文档 |
| `/api/chat` | POST | RAG 问答（流式响应） |
| `/api/memory` | POST | 记忆管理 |
| `/api/stats` | GET | 学习统计 |

## 高级检索说明

### MQE（多查询扩展）

生成 3 个语义等价的查询，并行检索后合并结果，提升召回率。

### HyDE（假设文档嵌入）

先生成假设答案，用假设答案的 embedding 进行检索，改善检索精度。