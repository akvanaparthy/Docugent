import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { DocumentProcessor } from "@/lib/document-processor";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF and DOCX files are supported",
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = uuidv4();

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    // Extract text based on file type
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

    if (!text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract text from the document",
        },
        { status: 400 }
      );
    }

    // Process and store the document
    const processor = new DocumentProcessor();
    await processor.processDocument(documentId, text, file.name);

    return NextResponse.json({
      success: true,
      documentId,
      message: "Document processed successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process document",
      },
      { status: 500 }
    );
  }
}
