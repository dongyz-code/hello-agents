import axios from "axios";

const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || "http://localhost:8000";

interface EmbeddingResponse {
  embeddings: number[][];
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await axios.post<EmbeddingResponse>(
    `${EMBEDDING_API_URL}/embed`,
    { texts: [text] }
  );
  return response.data.embeddings[0];
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await axios.post<EmbeddingResponse>(
    `${EMBEDDING_API_URL}/embed`,
    { texts }
  );
  return response.data.embeddings;
}