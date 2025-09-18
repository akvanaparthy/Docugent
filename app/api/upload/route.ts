import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { DocumentProcessor } from "@/lib/document-processor";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload API called");

    // Validate request method
    if (request.method !== "POST") {
      return NextResponse.json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Form data parsing error:", error);
      return NextResponse.json(
        { success: false, error: "Invalid form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;

    console.log(
      "File received:",
      file
        ? {
            name: file.name,
            type: file.type,
            size: file.size,
          }
        : "No file"
    );

    if (!file) {
      console.log("Error: No file provided");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "File size too large. Maximum size is 10MB.",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    console.log("File type:", file.type, "Allowed types:", allowedTypes);

    if (!allowedTypes.includes(file.type)) {
      console.log("Error: File type not supported");
      return NextResponse.json(
        {
          success: false,
          error: `Only PDF and DOCX files are supported. Received: ${
            file.type || "unknown"
          }`,
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = uuidv4();

    // Read file content with error handling
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (error) {
      console.error("File reading error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to read file content",
        },
        { status: 400 }
      );
    }

    let text = "";

    // Extract text based on file type with error handling
    try {
      if (file.type === "application/pdf") {
        const pdfData = await pdf(buffer);
        text = pdfData.text;
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      }
    } catch (error) {
      console.error("Text extraction error:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to extract text from document. The file might be corrupted or password-protected.",
        },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not extract text from the document. The document might be empty or corrupted.",
        },
        { status: 400 }
      );
    }

    // Process and store the document with error handling
    try {
      const processor = new DocumentProcessor();
      await processor.processDocument(documentId, text, file.name);
    } catch (error) {
      console.error("Document processing error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process and store document",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId,
      message: "Document processed successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout. Please try again with a smaller file.",
          },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing the document",
      },
      { status: 500 }
    );
  }
}
