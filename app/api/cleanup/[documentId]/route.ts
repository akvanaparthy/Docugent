import { NextRequest, NextResponse } from "next/server";
import { MongoDocumentProcessor } from "@/lib/mongodb-document-processor";
import { getSessionIdFromRequest } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;
    const sessionId = getSessionIdFromRequest(request);

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
    const processor = new MongoDocumentProcessor();
    await processor.cleanupDocument(documentId, sessionId);

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
