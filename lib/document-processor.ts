// Local LLM integration for embeddings and chat completions

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
// Making these global so they persist across different instances and requests
declare global {
  var __documentStore: Map<string, DocumentChunk[]> | undefined;
  var __documentMetadata:
    | Map<string, { source: string; processedAt: Date }>
    | undefined;
}

const documentStore =
  globalThis.__documentStore ?? new Map<string, DocumentChunk[]>();
const documentMetadata =
  globalThis.__documentMetadata ??
  new Map<string, { source: string; processedAt: Date }>();

// Store references globally to persist across requests
globalThis.__documentStore = documentStore;
globalThis.__documentMetadata = documentMetadata;

export class DocumentProcessor {
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  async processDocument(
    documentId: string,
    text: string,
    source: string
  ): Promise<void> {
    try {
      // Pre-load model to prevent JIT loading during document processing
      await this.ensureModelLoaded();

      // Validate inputs
      if (!documentId || typeof documentId !== "string") {
        throw new Error("Invalid document ID provided");
      }

      if (!text || typeof text !== "string") {
        throw new Error("Invalid text content provided");
      }

      if (!source || typeof source !== "string") {
        throw new Error("Invalid source provided");
      }

      if (text.trim().length === 0) {
        throw new Error("Text content is empty");
      }

      if (text.length > 1000000) {
        // 1MB text limit
        throw new Error("Text content is too large. Maximum size is 1MB.");
      }

      console.log(
        `Processing document ${documentId} with ${text.length} characters`
      );

      // Clean and preprocess text
      const cleanedText = this.preprocessText(text);

      if (cleanedText.length === 0) {
        throw new Error("Text preprocessing resulted in empty content");
      }

      // Split text into chunks
      const chunks = this.splitIntoChunks(cleanedText);

      if (chunks.length === 0) {
        throw new Error("Failed to split text into chunks");
      }

      console.log(`Split text into ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateEmbeddings(
        chunks,
        documentId,
        source
      );

      if (chunksWithEmbeddings.length === 0) {
        throw new Error("Failed to generate embeddings for document chunks");
      }

      // Store chunks
      documentStore.set(documentId, chunksWithEmbeddings);
      documentMetadata.set(documentId, { source, processedAt: new Date() });

      console.log(
        `Processed document ${documentId} with ${chunks.length} chunks`
      );
      console.log(
        "Document stored successfully. Total documents:",
        documentStore.size
      );
      console.log(
        "Document metadata stored. Total metadata entries:",
        documentMetadata.size
      );
    } catch (error) {
      console.error("Error processing document:", error);

      // Clean up any partial data
      try {
        documentStore.delete(documentId);
        documentMetadata.delete(documentId);
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }

      throw error;
    }
  }

  async retrieveContext(
    documentId: string,
    query: string,
    topK: number = 5
  ): Promise<string> {
    try {
      // Validate inputs
      if (!documentId || typeof documentId !== "string") {
        throw new Error("Invalid document ID provided");
      }

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query provided");
      }

      if (query.trim().length === 0) {
        throw new Error("Query cannot be empty");
      }

      if (topK < 1 || topK > 20) {
        throw new Error("topK must be between 1 and 20");
      }

      console.log("Retrieving context for documentId:", documentId);
      console.log("Available documents:", Array.from(documentStore.keys()));
      console.log(
        "Document metadata keys:",
        Array.from(documentMetadata.keys())
      );

      const documentChunks = documentStore.get(documentId);
      if (!documentChunks || documentChunks.length === 0) {
        console.log("Document chunks not found for ID:", documentId);
        throw new Error("Document not found or not processed");
      }

      console.log(
        `Found ${documentChunks.length} chunks for document ${documentId}`
      );

      // Generate embedding for the query (or use text-based similarity if disabled)
      let queryEmbedding: number[];
      if (process.env.DISABLE_EMBEDDINGS === "true") {
        console.log(
          "Embeddings disabled, using text-based similarity for query"
        );
        queryEmbedding = this.createTextBasedEmbedding(query);
      } else {
        try {
          queryEmbedding = await this.createEmbedding(query);
        } catch (error) {
          console.error("Failed to create query embedding:", error);
          throw new Error("Failed to process query for similarity search");
        }

        if (!queryEmbedding || queryEmbedding.length === 0) {
          throw new Error("Failed to generate query embedding");
        }
      }

      // Calculate similarity scores
      const similarities = documentChunks.map((chunk) => {
        try {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            chunk.embedding
          );
          return {
            chunk,
            similarity,
          };
        } catch (error) {
          console.error("Error calculating similarity for chunk:", error);
          return {
            chunk,
            similarity: 0, // Fallback to 0 similarity
          };
        }
      });

      // Sort by similarity and get top K
      const topChunks = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map((item) => item.chunk);

      if (topChunks.length === 0) {
        throw new Error("No relevant chunks found for the query");
      }

      // Combine relevant chunks
      const context = topChunks.map((chunk) => chunk.text).join("\n\n");

      if (!context || context.trim().length === 0) {
        throw new Error("No meaningful context could be extracted");
      }

      console.log(
        `Retrieved context with ${topChunks.length} chunks, total length: ${context.length}`
      );
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

    // If embeddings are disabled, use text-based similarity without API calls
    if (process.env.DISABLE_EMBEDDINGS === "true") {
      console.log(
        "Embeddings disabled, using text-based similarity for all chunks"
      );

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = this.createTextBasedEmbedding(chunk);

        chunksWithEmbeddings.push({
          id: `${documentId}-${i}`,
          text: chunk,
          embedding,
          metadata: {
            documentId,
            chunkIndex: i,
            source,
          },
        });
      }

      return chunksWithEmbeddings;
    }

    // Process chunks sequentially to avoid concurrent API calls (only if embeddings are enabled)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.createEmbedding(chunk);

      chunksWithEmbeddings.push({
        id: `${documentId}-${i}`,
        text: chunk,
        embedding,
        metadata: {
          documentId,
          chunkIndex: i,
          source,
        },
      });
    }

    return chunksWithEmbeddings;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    try {
      // Check if embeddings are disabled
      if (process.env.DISABLE_EMBEDDINGS === "true") {
        console.log("Embeddings disabled, using text-based similarity");
        return this.createTextBasedEmbedding(text);
      }

      // Skip model loading since embeddings are disabled

      // Validate input
      if (!text || typeof text !== "string") {
        throw new Error("Invalid text provided for embedding");
      }

      if (text.trim().length === 0) {
        throw new Error("Text cannot be empty for embedding");
      }

      if (text.length > 8000) {
        // Token limit for most embedding models
        console.warn(
          "Text is too long for embedding, truncating to 8000 characters"
        );
        text = text.substring(0, 8000);
      }

      console.log(
        "Creating embedding for text:",
        text.substring(0, 100) + "..."
      );

      // Use local LLM for embeddings (same model as chat)
      const apiKey = process.env.LM_API_KEY || "lmstudio";
      const baseURLRaw = process.env.LM_BASE_URL || "http://127.0.0.1:1234/v1";
      const baseURL = baseURLRaw.replace(/\/+$/g, "");
      const makeEndpoint = (path: string) =>
        baseURL.endsWith("/v1") ? `${baseURL}${path}` : `${baseURL}/v1${path}`;
      const model =
        process.env.LM_MODEL ||
        "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2";

      console.log("Using local LLM for embeddings:", baseURL);
      console.log("Using model:", model);
      console.log("API key present:", apiKey ? "Yes" : "No");

      const response = await fetch(`${baseURL}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model, // Use same model as chat
          input: text,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log("Embedding response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Embedding error response:", errorText);

        if (response.status === 401) {
          throw new Error("Authentication failed for embedding service");
        }
        if (response.status === 404) {
          // Check if it's the "No models loaded" error
          if (errorText.includes("No models loaded")) {
            console.log(
              "No models loaded in LM Studio, falling back to text-based similarity"
            );
            throw new Error("No models loaded in LM Studio");
          }
          throw new Error("Embedding model not found");
        }
        if (response.status === 429) {
          throw new Error("Rate limit exceeded for embedding service");
        }
        if (response.status >= 500) {
          throw new Error("Embedding service is temporarily unavailable");
        }

        throw new Error(
          `Embedding API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      if (
        !data ||
        !data.data ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        throw new Error("Invalid response structure from embedding service");
      }

      const embedding = data.data[0].embedding;

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Invalid embedding data received");
      }

      console.log(
        `Successfully created embedding with ${embedding.length} dimensions`
      );
      return embedding;
    } catch (error) {
      console.log(
        "Embedding failed, falling back to text-based similarity:",
        error
      );

      // Fallback to simple text-based similarity
      try {
        console.log("Using text-based similarity as fallback");
        return this.createTextBasedEmbedding(text);
      } catch (fallbackError) {
        console.error("Fallback embedding also failed:", fallbackError);
        throw new Error(
          "Failed to create embedding using both primary and fallback methods"
        );
      }
    }
  }

  private createTextBasedEmbedding(text: string): number[] {
    // Simple text-based embedding using word frequency
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq: { [key: string]: number } = {};

    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Create a simple vector representation
    const allWords = Object.keys(wordFreq);
    const embedding = new Array(384).fill(0); // Standard embedding size

    allWords.forEach((word, index) => {
      if (index < 384) {
        embedding[index] = wordFreq[word] / words.length;
      }
    });

    return embedding;
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

  private async ensureModelLoaded(): Promise<void> {
    try {
      const apiKey = process.env.LM_API_KEY || "lmstudio";
      const baseURLRaw = process.env.LM_BASE_URL || "http://127.0.0.1:1234/v1";
      const baseURL = baseURLRaw.replace(/\/+$/g, "");
      const makeEndpoint = (path: string) =>
        baseURL.endsWith("/v1") ? `${baseURL}${path}` : `${baseURL}/v1${path}`;
      const model =
        process.env.LM_MODEL ||
        "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2";

      // Check if model is already loaded
      const modelsResponse = await fetch(makeEndpoint("/models"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const isModelAlreadyLoaded = modelsData.data?.some(
          (modelItem: any) => modelItem.id === model
        );

        if (isModelAlreadyLoaded) {
          console.log(
            `Model ${model} is already loaded for document processing`
          );
          return;
        }
      }

      // Trigger model loading with a small request
      console.log(`Pre-loading model ${model} for document processing...`);
      const loadResponse = await fetch(makeEndpoint("/chat/completions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "preload" }],
          max_tokens: 1,
          temperature: 0,
        }),
      });

      if (loadResponse.ok) {
        console.log(
          `Model ${model} pre-loaded successfully for document processing`
        );
      } else {
        console.warn(`Failed to pre-load model: ${loadResponse.status}`);
      }
    } catch (error) {
      console.warn("Model pre-loading failed for document processing:", error);
      // Don't throw error, just log warning and continue
    }
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

    documentMetadata.forEach((metadata, documentId) => {
      const chunks = documentStore.get(documentId);
      if (chunks) {
        documents.push({
          documentId,
          source: metadata.source,
          processedAt: metadata.processedAt,
          chunkCount: chunks.length,
        });
      }
    });

    return documents;
  }

  async cleanupDocument(documentId: string): Promise<void> {
    try {
      // Remove document chunks from store
      documentStore.delete(documentId);

      // Remove metadata from store
      documentMetadata.delete(documentId);

      console.log(`Document ${documentId} cleaned up successfully`);
    } catch (error) {
      console.error(`Failed to cleanup document ${documentId}:`, error);
      throw error;
    }
  }
}
