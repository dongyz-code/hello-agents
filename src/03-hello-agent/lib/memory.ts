import fs from "node:fs";
import path from "node:path";
import type { MemoryItem } from "./types.js";

export class MemoryStore {
  private memories: MemoryItem[] = [];
  private filePath: string;
  private userId: string;

  constructor(userId: string = "default") {
    this.userId = userId;
    this.filePath = path.join(process.cwd(), `data/memories_${userId}.json`);
    this.load();
  }

  private load(): void {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf-8");
        this.memories = JSON.parse(data);
      }
    } catch {
      this.memories = [];
    }
  }

  private save(): void {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.memories, null, 2));
  }

  add(
    content: string,
    type: MemoryItem["type"],
    importance: number = 0.5,
    metadata?: Record<string, unknown>,
  ): MemoryItem {
    const memory: MemoryItem = {
      id: `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content,
      type,
      importance,
      timestamp: Date.now(),
      metadata,
    };

    this.memories.push(memory);
    this.save();
    return memory;
  }

  search(query: string, limit: number = 10): MemoryItem[] {
    // 简单的关键词搜索
    const keywords = query.toLowerCase().split(/\s+/);
    const results = this.memories.filter((m) =>
      keywords.some((k) => m.content.toLowerCase().includes(k)),
    );

    // 按重要性和时间排序
    return results
      .sort((a, b) => {
        const scoreA = a.importance * 0.6 + (a.timestamp / Date.now()) * 0.4;
        const scoreB = b.importance * 0.6 + (b.timestamp / Date.now()) * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  getByType(type: MemoryItem["type"]): MemoryItem[] {
    return this.memories.filter((m) => m.type === type);
  }

  getAll(): MemoryItem[] {
    return this.memories;
  }

  clear(): void {
    this.memories = [];
    this.save();
  }

  getStats(): {
    total: number;
    working: number;
    episodic: number;
    semantic: number;
  } {
    return {
      total: this.memories.length,
      working: this.memories.filter((m) => m.type === "working").length,
      episodic: this.memories.filter((m) => m.type === "episodic").length,
      semantic: this.memories.filter((m) => m.type === "semantic").length,
    };
  }
}

export function createMemoryStore(userId: string): MemoryStore {
  return new MemoryStore(userId);
}