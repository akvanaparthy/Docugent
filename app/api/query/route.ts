import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { DocumentProcessor } from "@/lib/document-processor";

export async function POST(request: NextRequest) {
  try {
    const { query, documentId } = await request.json();

    if (!query || !documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Query and document ID are required",
        },
        { status: 400 }
      );
    }

    // Retrieve relevant context from the document
    const processor = new DocumentProcessor();
    const context = await processor.retrieveContext(documentId, query);

    if (!context || context.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No relevant context found for your query",
        },
        { status: 400 }
      );
    }

    // Generate response using AI
    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      system: `You are a helpful assistant that answers questions based on the provided document context. 
      Use only the information from the context to answer the user's question. 
      If the context doesn't contain enough information to answer the question, say so clearly.
      Be concise but comprehensive in your answers.`,
      prompt: `Context from document:
${context}

User question: ${query}

Please provide a helpful answer based on the context above.`,
      maxTokens: 1000,
    });

    return NextResponse.json({
      success: true,
      answer: text,
      context: context.substring(0, 200) + "...", // Include snippet for debugging
    });
  } catch (error) {
    console.error("Query processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process query",
      },
      { status: 500 }
    );
  }
}
