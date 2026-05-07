import fs from "node:fs";
import pdfParse from "pdf-parse";
import type { DocumentChunk } from "./types.js";

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions,
): DocumentChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const chunks: DocumentChunk[] = [];

  // 按固定大小分块
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content,
        metadata: {
          source: "document",
          chunkIndex,
        },
      });
      chunkIndex++;
    }

    start += chunkSize - chunkOverlap;
  }

  return chunks;
}

export async function processDocument(
  filePath: string,
  options: ChunkOptions = { chunkSize: 1000, chunkOverlap: 200 },
): Promise<{ chunks: DocumentChunk[]; documentName: string }> {
  const text = await extractTextFromPDF(filePath);
  const chunks = splitTextIntoChunks(text, options);
  const documentName = filePath.split("/").pop() || "unknown";

  return { chunks, documentName };
}
