import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    documentId: string;
    chunkIndex: number;
    source: string;
  };
}

// In-memory storage for demo purposes
// In production, you'd use a proper vector database like Pinecone, Weaviate, or Vercel's Vector Store
const documentStore = new Map<string, DocumentChunk[]>();
const documentMetadata = new Map<
  string,
  { source: string; processedAt: Date }
>();

export class DocumentProcessor {
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  async processDocument(
    documentId: string,
    text: string,
    source: string
  ): Promise<void> {
    try {
      // Clean and preprocess text
      const cleanedText = this.preprocessText(text);

      // Split text into chunks
      const chunks = this.splitIntoChunks(cleanedText);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateEmbeddings(
        chunks,
        documentId,
        source
      );

      // Store chunks
      documentStore.set(documentId, chunksWithEmbeddings);
      documentMetadata.set(documentId, { source, processedAt: new Date() });

      console.log(
        `Processed document ${documentId} with ${chunks.length} chunks`
      );
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }

  async retrieveContext(
    documentId: string,
    query: string,
    topK: number = 5
  ): Promise<string> {
    try {
      const documentChunks = documentStore.get(documentId);
      if (!documentChunks || documentChunks.length === 0) {
        throw new Error("Document not found or not processed");
      }

      // Generate embedding for the query
      const { embedding: queryEmbedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });

      // Calculate similarity scores
      const similarities = documentChunks.map((chunk) => ({
        chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      // Sort by similarity and get top K
      const topChunks = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map((item) => item.chunk);

      // Combine relevant chunks
      const context = topChunks.map((chunk) => chunk.text).join("\n\n");

      return context;
    } catch (error) {
      console.error("Error retrieving context:", error);
      throw error;
    }
  }

  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const potentialChunk =
        currentChunk + (currentChunk ? ". " : "") + trimmedSentence;

      if (potentialChunk.length <= this.chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private async generateEmbeddings(
    chunks: string[],
    documentId: string,
    source: string
  ): Promise<DocumentChunk[]> {
    const chunksWithEmbeddings: DocumentChunk[] = [];

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const embeddings = await Promise.all(
        batch.map(async (chunk, index) => {
          const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: chunk,
          });

          return {
            id: `${documentId}-${i + index}`,
            text: chunk,
            embedding,
            metadata: {
              documentId,
              chunkIndex: i + index,
              source,
            },
          };
        })
      );

      chunksWithEmbeddings.push(...embeddings);
    }

    return chunksWithEmbeddings;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getDocumentInfo(
    documentId: string
  ): { source: string; processedAt: Date; chunkCount: number } | null {
    const metadata = documentMetadata.get(documentId);
    const chunks = documentStore.get(documentId);

    if (!metadata || !chunks) {
      return null;
    }

    return {
      source: metadata.source,
      processedAt: metadata.processedAt,
      chunkCount: chunks.length,
    };
  }

  listDocuments(): Array<{
    documentId: string;
    source: string;
    processedAt: Date;
    chunkCount: number;
  }> {
    const documents: Array<{
      documentId: string;
      source: string;
      processedAt: Date;
      chunkCount: number;
    }> = [];

    for (const [documentId, metadata] of documentMetadata.entries()) {
      const chunks = documentStore.get(documentId);
      if (chunks) {
        documents.push({
          documentId,
          source: metadata.source,
          processedAt: metadata.processedAt,
          chunkCount: chunks.length,
        });
      }
    }

    return documents;
  }
}
