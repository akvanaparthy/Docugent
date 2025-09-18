import { NextRequest, NextResponse } from "next/server";
import { DocumentProcessor } from "@/lib/document-processor";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 }
      );
    }

    // Clean up document resources
    const processor = new DocumentProcessor();
    await processor.cleanupDocument(documentId);

    return NextResponse.json({
      success: true,
      message: "Document cleaned up successfully",
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup document",
      },
      { status: 500 }
    );
  }
}
