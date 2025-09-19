import { NextRequest, NextResponse } from "next/server";
import { loadConfig, makeEndpoint } from "@/lib/config";

export async function GET(_request: NextRequest) {
  try {
    const cfg = loadConfig();
    const endpoint = (path: string) => makeEndpoint(cfg.lm.baseUrl, path);

    // Quick health check to LM Studio with cache-busting
    const response = await fetch(endpoint("/models"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.lm.apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(3000), // 3 second timeout for faster detection
    });

    if (response.ok) {
      return NextResponse.json({
        status: "online",
        message: "LM Studio server is running",
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        status: "offline",
        message: `LM Studio server returned ${response.status}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("LM Studio connectivity check failed:", error);
    return NextResponse.json({
      status: "offline",
      message: "LM Studio server is not reachable",
      timestamp: new Date().toISOString(),
    });
  }
}
