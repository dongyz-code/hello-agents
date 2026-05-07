import { randomUUID } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { DocumentChunk, SearchResult } from "./types.js";

export class VectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize = 512;

  constructor(collectionName: string = "documents") {
    this.client = new QdrantClient({ host: "localhost", port: 6333 });
    this.collectionName = collectionName;
  }

  async initCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === this.collectionName,
    );
    if (exists) return;

    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: this.vectorSize,
        distance: "Cosine",
      },
    });
  }

  async addVectors(
    embeddings: number[][],
    chunks: DocumentChunk[],
  ): Promise<void> {
    const points = embeddings.map((embedding, index) => ({
      id: randomUUID(),
      vector: embedding,
      payload: {
        content: chunks[index].content,
        metadata: chunks[index].metadata,
        chunkId: chunks[index].id,
      },
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(queryVector: number[], limit: number = 5): Promise<SearchResult[]> {
    const result = await this.client.search(this.collectionName, {
      vector: queryVector,
      limit,
    });

    return result.map((hit) => ({
      id: String(hit.id),
      content: String(hit.payload?.content || ""),
      score: hit.score,
      metadata: (hit.payload?.metadata as SearchResult["metadata"]) || {
        source: "unknown",
        chunkIndex: 0,
      },
    }));
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
    } catch {
      // Ignore if collection doesn't exist
    }
  }

  async getStats(): Promise<{ vectorsCount: number }> {
    const info = await this.client.getCollection(this.collectionName);
    return {
      vectorsCount: info.points_count || 0,
    };
  }
}

export function createVectorStore(collectionName: string): VectorStore {
  return new VectorStore(collectionName);
}