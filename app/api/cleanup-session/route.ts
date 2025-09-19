import { NextRequest, NextResponse } from "next/server";
import { MongoDocumentProcessor } from "@/lib/mongodb-document-processor";
import { getSessionIdFromRequest } from "@/lib/session";

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionIdFromRequest(request);

    if (!sessionId || sessionId === "default") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid session ID is required",
        },
        { status: 400 }
      );
    }

    // Clean up session resources
    const processor = new MongoDocumentProcessor();
    await processor.cleanupSession(sessionId);

    return NextResponse.json({
      success: true,
      message: "Session cleaned up successfully",
    });
  } catch (error) {
    console.error("Session cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup session",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle sendBeacon requests (which use POST)
    let sessionId: string;

    try {
      const body = await request.json();
      sessionId = body.sessionId;
    } catch {
      // Fallback to header if JSON parsing fails
      sessionId = getSessionIdFromRequest(request);
    }

    if (!sessionId || sessionId === "default") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid session ID is required",
        },
        { status: 400 }
      );
    }

    // Clean up session resources
    const processor = new MongoDocumentProcessor();
    await processor.cleanupSession(sessionId);

    return NextResponse.json({
      success: true,
      message: "Session cleaned up successfully",
    });
  } catch (error) {
    console.error("Session cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup session",
      },
      { status: 500 }
    );
  }
}
