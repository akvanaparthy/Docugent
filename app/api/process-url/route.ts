import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import * as cheerio from "cheerio";
import { DocumentProcessor } from "@/lib/document-processor";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "No URL provided" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the webpage content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    // Parse HTML content
    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $("script, style, nav, header, footer, aside").remove();

    // Extract main content
    let text = "";

    // Try to find main content areas
    const contentSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      ".main-content",
      ".post-content",
      ".entry-content",
    ];

    let mainContent = null;
    for (const selector of contentSelectors) {
      mainContent = $(selector).first();
      if (mainContent.length > 0) break;
    }

    if (mainContent && mainContent.length > 0) {
      text = mainContent.text();
    } else {
      // Fallback to body content
      text = $("body").text();
    }

    // Clean up the text
    text = text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    if (!text || text.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract sufficient content from the URL",
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = uuidv4();

    // Process and store the document
    const processor = new DocumentProcessor();
    await processor.processDocument(documentId, text, url);

    return NextResponse.json({
      success: true,
      documentId,
      message: "URL processed successfully",
    });
  } catch (error) {
    console.error("URL processing error:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return NextResponse.json(
          {
            success: false,
            error: "Could not reach the URL. Please check if it is accessible.",
          },
          { status: 400 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "URL not found (404)",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process URL",
      },
      { status: 500 }
    );
  }
}
