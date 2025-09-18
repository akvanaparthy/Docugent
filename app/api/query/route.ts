import { NextRequest, NextResponse } from "next/server";
import { DocumentProcessor } from "@/lib/document-processor";
import { loadConfig, makeEndpoint } from "@/lib/config";

export async function POST(request: NextRequest): Promise<Response> {
  // Queue the request to prevent concurrent processing
  return new Promise<Response>((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await processQuery(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    processQueue();
  });
}

async function processQuery(request: NextRequest): Promise<Response> {
  try {
    // Validate request method
    if (request.method !== "POST") {
      return NextResponse.json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    // Parse request body with error handling
    let requestBody: { query?: string; documentId?: string };
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { query, documentId } = requestBody;

    if (!query || !documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Query and document ID are required",
        },
        { status: 400 }
      );
    }

    if (typeof query !== "string" || typeof documentId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Query and document ID must be strings",
        },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Query cannot be empty",
        },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Query is too long. Maximum length is 1000 characters.",
        },
        { status: 400 }
      );
    }

    // Retrieve relevant context from the document with error handling
    let context: string;
    try {
      const processor = new DocumentProcessor();
      context = await processor.retrieveContext(documentId, query);
    } catch (error) {
      console.error("Context retrieval error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve document context",
        },
        { status: 500 }
      );
    }

    if (!context || context.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No relevant context found for your query. Please try rephrasing your question or check if the document was processed correctly.",
        },
        { status: 400 }
      );
    }

    // Generate response using local LLM with enhanced error handling
    const cfg = loadConfig();
    const apiKey = cfg.lm.apiKey;
    const baseURL = cfg.lm.baseUrl;
    const endpoint = (path: string) => makeEndpoint(baseURL, path);
    const model = cfg.lm.model;

    console.log("Using local LLM for chat:", baseURL);

    // Pre-load model to prevent JIT loading on every request
    await ensureModelLoaded();

    let llmResponse;
    const startTime = Date.now();
    try {
      console.log(`Starting LLM request at ${new Date().toISOString()}`);
      llmResponse = await fetch(endpoint("/chat/completions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: activeModelId || model,
          messages: [
            {
              role: "system",
              content: cfg.prompts.system,
            },
            {
              role: "user",
              content: `Context from document:
${context}

User question: ${query}

Please provide a helpful answer based on the context above.`,
            },
          ],
          max_tokens: 2000, // Increased for longer responses
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout for long responses
      });
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`LLM API call error after ${duration}ms:`, error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return NextResponse.json(
            {
              success: false,
              error:
                "Request timeout. The AI service took longer than 2 minutes to respond. This might be due to a complex query or server load. Please try again with a simpler question.",
            },
            { status: 408 }
          );
        }
        if (error.message.includes("ECONNREFUSED")) {
          return NextResponse.json(
            {
              success: false,
              error:
                "AI service is not available. Please check if the local LLM server is running.",
            },
            { status: 503 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to AI service. Please try again later.",
        },
        { status: 503 }
      );
    }

    if (!llmResponse.ok) {
      console.error(
        "LLM API response error:",
        llmResponse.status,
        llmResponse.statusText
      );

      if (llmResponse.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error:
              "AI service authentication failed. Please check the API key.",
          },
          { status: 401 }
        );
      }

      if (llmResponse.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "AI service is overloaded. Please try again in a moment.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "AI service returned an error. Please try again later.",
        },
        { status: 502 }
      );
    }

    let data;
    try {
      data = await llmResponse.json();
    } catch (error) {
      console.error("LLM response parsing error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response. Please try again.",
        },
        { status: 502 }
      );
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid LLM response structure:", data);
      return NextResponse.json(
        {
          success: false,
          error: "AI service returned an invalid response. Please try again.",
        },
        { status: 502 }
      );
    }

    const text = data.choices[0].message.content;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI service returned an empty response. Please try rephrasing your question.",
        },
        { status: 400 }
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(
      `LLM response received successfully after ${duration}ms. Response length: ${text.length} characters`
    );

    return NextResponse.json({
      success: true,
      answer: text,
      context: context.substring(0, 200) + "...", // Include snippet for debugging
    });
  } catch (error) {
    console.error("Query processing error:", error);

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing your query",
      },
      { status: 500 }
    );
  }
}

// Global model loading state to prevent multiple simultaneous loads
let modelLoadingPromise: Promise<void> | null = null;
let isModelLoaded = false;
let activeModelId: string | null = null;

// Request queue to prevent concurrent requests from interfering
let requestQueue: Array<() => Promise<any>> = [];
let isProcessingRequest = false;

// Function to ensure model is loaded and prevent JIT loading
async function ensureModelLoaded(): Promise<void> {
  // If model is already loaded, return immediately
  if (isModelLoaded) {
    console.log("Model already loaded, skipping pre-load");
    return;
  }

  // If model is currently loading, wait for it to complete
  if (modelLoadingPromise) {
    console.log("Model is currently loading, waiting for completion");
    await modelLoadingPromise;
    return;
  }

  // Start loading the model
  modelLoadingPromise = loadModel();
  await modelLoadingPromise;
  modelLoadingPromise = null;
}

// Choose a valid model id if the configured one is not available
function getSelectedModelId(available?: string[]): string | null {
  const preferred =
    process.env.LM_MODEL || "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2";
  if (!available || available.length === 0) return preferred;
  if (available.includes(preferred)) return preferred;
  // Try common fallbacks reported by LM Studio
  const fallbacks = [
    "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed",
    "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed-i1",
    "dolphin-2.9.3-mistral-nemo-12b",
  ];
  for (const id of fallbacks) {
    if (available.includes(id)) return id;
  }
  return available[0] || preferred;
}

async function loadModel(): Promise<void> {
  try {
    const cfg = loadConfig();
    const apiKey = cfg.lm.apiKey;
    const baseURL = cfg.lm.baseUrl;
    const endpoint = (path: string) => makeEndpoint(baseURL, path);
    const model = cfg.lm.model;

    console.log(`Pre-loading model: ${model}`);

    // Resolve a model id once (only hit /models if we haven't chosen yet)
    if (!activeModelId) {
      const modelsResponse = await fetch(endpoint("/models"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const availableModelIds: string[] =
          modelsData.data?.map((m: any) => m.id) || [];
        activeModelId = getSelectedModelId(availableModelIds) || model;
      } else {
        // Fall back to configured model if listing fails
        activeModelId = model;
      }
    }

    // Trigger model loading with a small request
    console.log(`Loading model ${activeModelId || model}...`);
    const loadResponse = await fetch(endpoint("/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: activeModelId || model,
        messages: [{ role: "user", content: "preload" }],
        max_tokens: 1,
        temperature: 0,
      }),
    });

    if (loadResponse.ok) {
      console.log(`Model ${model} loaded successfully`);
      isModelLoaded = true;
    } else {
      console.error(`Failed to load model: ${loadResponse.status}`);
      throw new Error(`Model loading failed: ${loadResponse.status}`);
    }
  } catch (error) {
    console.error("Model loading error:", error);
    throw error;
  }
}

// Process the request queue sequentially
async function processQueue() {
  if (isProcessingRequest || requestQueue.length === 0) {
    return;
  }

  isProcessingRequest = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error("Request processing error:", error);
      }
    }
  }

  isProcessingRequest = false;
}
