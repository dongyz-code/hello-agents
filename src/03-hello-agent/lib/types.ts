// 类型定义

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: DocumentChunk["metadata"];
}

export interface MemoryItem {
  id: string;
  content: string;
  type: "working" | "episodic" | "semantic";
  importance: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RAGConfig {
  collectionName: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  enableMQE: boolean;
  enableHyDE: boolean;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  documentName?: string;
  chunksCount?: number;
}

export interface StatsResponse {
  sessionStart: number;
  documentsLoaded: number;
  questionsAsked: number;
  notesCount: number;
}