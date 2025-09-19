import { Collection } from "mongodb";
import { connectToDatabase } from "./mongodb";
import { loadConfig, makeEndpoint as makeEp } from "./config";

interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    documentId: string;
    chunkIndex: number;
    source: string;
    sessionId: string;
  };
}

interface DocumentMetadata {
  documentId: string;
  sessionId: string;
  source: string;
  processedAt: Date;
  chunkCount: number;
}

export class MongoDocumentProcessor {
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  private async getCollections(): Promise<{
    documents: Collection<DocumentChunk>;
    metadata: Collection<DocumentMetadata>;
  }> {
    const db = await connectToDatabase();
    return {
      documents: db.collection<DocumentChunk>("documents"),
      metadata: db.collection<DocumentMetadata>("metadata"),
    };
  }

  async processDocument(
    documentId: string,
    text: string,
    source: string,
    sessionId: string = "default"
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
        `Processing document ${documentId} with ${text.length} characters for session ${sessionId}`
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
        source,
        sessionId
      );

      if (chunksWithEmbeddings.length === 0) {
        throw new Error("Failed to generate embeddings for document chunks");
      }

      // Get MongoDB collections
      const { documents, metadata } = await this.getCollections();

      // Store chunks in MongoDB
      await documents.insertMany(chunksWithEmbeddings);

      // Store metadata
      await metadata.insertOne({
        documentId,
        sessionId,
        source,
        processedAt: new Date(),
        chunkCount: chunksWithEmbeddings.length,
      });

      console.log(
        `Processed document ${documentId} with ${chunks.length} chunks for session ${sessionId}`
      );
    } catch (error) {
      console.error("Error processing document:", error);

      // Clean up any partial data
      try {
        await this.cleanupDocument(documentId, sessionId);
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }

      throw error;
    }
  }

  async retrieveContext(
    documentId: string,
    query: string,
    topK: number = 5,
    sessionId: string = "default"
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

      console.log(
        "Retrieving context for documentId:",
        documentId,
        "sessionId:",
        sessionId
      );

      // Get MongoDB collections
      const { documents, metadata } = await this.getCollections();

      // Check if document exists for this session
      const docMetadata = await metadata.findOne({
        documentId,
        sessionId,
      });

      if (!docMetadata) {
        console.log("Document not found for session:", sessionId);
        throw new Error("Document not found or not processed");
      }

      // Get document chunks for this session
      const documentChunks = await documents
        .find({
          "metadata.documentId": documentId,
          "metadata.sessionId": sessionId,
        })
        .toArray();

      if (!documentChunks || documentChunks.length === 0) {
        console.log(
          "Document chunks not found for ID:",
          documentId,
          "in session:",
          sessionId
        );
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
    source: string,
    sessionId: string
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
            sessionId,
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
          sessionId,
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
      const cfg = loadConfig();
      const apiKey = cfg.lm.apiKey;
      const baseURL = cfg.lm.baseUrl;
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
    documentId: string,
    sessionId: string = "default"
  ): Promise<{ source: string; processedAt: Date; chunkCount: number } | null> {
    return this.getCollections().then(async ({ metadata }) => {
      const docMetadata = await metadata.findOne({
        documentId,
        sessionId,
      });

      if (!docMetadata) {
        return null;
      }

      return {
        source: docMetadata.source,
        processedAt: docMetadata.processedAt,
        chunkCount: docMetadata.chunkCount,
      };
    });
  }

  private async ensureModelLoaded(): Promise<void> {
    try {
      const cfg = loadConfig();
      const apiKey = cfg.lm.apiKey;
      const baseURL = cfg.lm.baseUrl;
      const endpoint = (path: string) => makeEp(baseURL, path);
      const model =
        process.env.LM_MODEL ||
        "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2";

      // Check if model is already loaded
      const modelsResponse = await fetch(endpoint("/models"), {
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
      const loadResponse = await fetch(endpoint("/chat/completions"), {
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

  listDocuments(sessionId: string = "default"): Promise<
    Array<{
      documentId: string;
      source: string;
      processedAt: Date;
      chunkCount: number;
    }>
  > {
    return this.getCollections().then(async ({ metadata }) => {
      const documents = await metadata
        .find({ sessionId })
        .sort({ processedAt: -1 })
        .toArray();

      return documents.map((doc) => ({
        documentId: doc.documentId,
        source: doc.source,
        processedAt: doc.processedAt,
        chunkCount: doc.chunkCount,
      }));
    });
  }

  async cleanupDocument(
    documentId: string,
    sessionId: string = "default"
  ): Promise<void> {
    try {
      // Get MongoDB collections
      const { documents, metadata } = await this.getCollections();

      // Remove document chunks from MongoDB
      await documents.deleteMany({
        "metadata.documentId": documentId,
        "metadata.sessionId": sessionId,
      });

      // Remove metadata from MongoDB
      await metadata.deleteOne({
        documentId,
        sessionId,
      });

      console.log(
        `Document ${documentId} cleaned up successfully from session ${sessionId}`
      );
    } catch (error) {
      console.error(
        `Failed to cleanup document ${documentId} from session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    try {
      // Get MongoDB collections
      const { documents, metadata } = await this.getCollections();

      // Remove all documents for this session
      await documents.deleteMany({
        "metadata.sessionId": sessionId,
      });

      // Remove all metadata for this session
      await metadata.deleteMany({
        sessionId,
      });

      console.log(`Session ${sessionId} cleaned up successfully`);
    } catch (error) {
      console.error(`Failed to cleanup session ${sessionId}:`, error);
      throw error;
    }
  }
}
