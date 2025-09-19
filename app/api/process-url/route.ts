import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { MongoDocumentProcessor } from "@/lib/mongodb-document-processor";
import { getSessionIdFromRequest, generateSessionId } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // Get or generate session ID
    let sessionId = getSessionIdFromRequest(request);
    if (sessionId === "default") {
      sessionId = generateSessionId();
    }

    // Validate request method
    if (request.method !== "POST") {
      return NextResponse.json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    // Parse request body with error handling
    let requestBody: { url?: string };
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { url } = requestBody;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "No URL provided" },
        { status: 400 }
      );
    }

    if (typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "URL must be a string" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Validate URL protocol
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { success: false, error: "Only HTTP and HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Fetch the webpage content with enhanced error handling
    let axiosResponse;
    try {
      // First attempt with full browser headers
      axiosResponse = await axios.get(url, {
        timeout: 15000, // Increased timeout
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Ch-Ua":
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
    } catch (error) {
      // If the first attempt fails with 403, try a simpler request
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status === 403
      ) {
        console.log("First attempt failed with 403, trying simpler request...");
        try {
          axiosResponse = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 3,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; DocugentBot/1.0; +https://docugent.com/bot)",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
        } catch (fallbackError) {
          // If fallback also fails, use the original error
          error = fallbackError;
        }
      }

      // If we still don't have a response, handle the error
      if (!axiosResponse) {
        console.error("URL fetch error:", error);

        if (axios.isAxiosError(error)) {
          if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Could not reach the URL. Please check if it is accessible and try again.",
              },
              { status: 400 }
            );
          }
          if (error.code === "ECONNABORTED") {
            return NextResponse.json(
              {
                success: false,
                error: "Request timeout. The website took too long to respond.",
              },
              { status: 408 }
            );
          }
          if (error.response && error.response.status === 404) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "URL not found (404). Please check the URL and try again.",
              },
              { status: 400 }
            );
          }
          if (error.response && error.response.status === 403) {
            // Check if it's a Cloudflare challenge
            const responseData = error.response.data || "";
            if (
              responseData.includes("cloudflare") ||
              responseData.includes("challenge") ||
              responseData.includes("Just a moment")
            ) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    "This website is protected by Cloudflare and cannot be accessed automatically. Please try a different URL or contact the website owner.",
                },
                { status: 400 }
              );
            }

            return NextResponse.json(
              {
                success: false,
                error:
                  "Access denied (403). The website blocked our request. This might be due to anti-bot protection.",
              },
              { status: 400 }
            );
          }
          if (error.response && error.response.status >= 500) {
            return NextResponse.json(
              {
                success: false,
                error: "Website server error. Please try again later.",
              },
              { status: 400 }
            );
          }
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to fetch the URL. Please check the URL and try again.",
          },
          { status: 400 }
        );
      }
    }

    // Ensure we have a valid response
    if (!axiosResponse) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch URL content" },
        { status: 500 }
      );
    }

    // Validate response content type
    const contentType = axiosResponse.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The URL does not contain HTML content. Only web pages are supported.",
        },
        { status: 400 }
      );
    }

    // Simple HTML parsing without cheerio to avoid compatibility issues
    let htmlContent = axiosResponse.data;
    let text = "";

    try {
      // Remove script and style elements using regex
      htmlContent = htmlContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

      // Extract main content using regex patterns

      // Try to find main content areas
      const contentPatterns = [
        /<main\b[^>]*>([\s\S]*?)<\/main>/i,
        /<article\b[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*main-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*page-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      ];

      let mainContent = "";
      for (const pattern of contentPatterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          mainContent = match[1];
          break;
        }
      }

      if (mainContent) {
        text = mainContent;
      } else {
        // Fallback to body content
        const bodyMatch = htmlContent.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
          text = bodyMatch[1];
        } else {
          text = htmlContent;
        }
      }

      // Remove HTML tags and clean up text
      text = text
        .replace(/<[^>]*>/g, " ") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
        .replace(/&amp;/g, "&") // Replace HTML entities
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    } catch (error) {
      console.error("HTML parsing error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse the webpage content.",
        },
        { status: 400 }
      );
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
          error:
            "Could not extract sufficient content from the URL. The page might be empty or require JavaScript to load content.",
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = uuidv4();

    // Process and store the document with error handling
    try {
      const processor = new MongoDocumentProcessor();
      await processor.processDocument(documentId, text, url, sessionId);
    } catch (error) {
      console.error("Document processing error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process and store the webpage content.",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      documentId,
      sessionId,
      message: "URL processed successfully",
    });

    // Add session ID to response headers
    response.headers.set("x-session-id", sessionId);
    return response;
  } catch (error) {
    console.error("URL processing error:", error);

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing the URL",
      },
      { status: 500 }
    );
  }
}
