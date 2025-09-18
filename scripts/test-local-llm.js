#!/usr/bin/env node

/**
 * Test script to verify local LLM connection
 * Run with: node scripts/test-local-llm.js
 */

const https = require("https");
const http = require("http");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const LM_BASE_URL = process.env.LM_BASE_URL || "http://127.0.0.1:1234/v1";
const LM_API_KEY = process.env.LM_API_KEY || "lmstudio";
const LM_MODEL =
  process.env.LM_MODEL || "dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2-i1";

console.log("🧪 Testing Local LLM Connection...\n");
console.log(`📍 Base URL: ${LM_BASE_URL}`);
console.log(`🔑 API Key: ${LM_API_KEY}`);
console.log(`🤖 Model: ${LM_MODEL}\n`);

async function testConnection() {
  try {
    // Test 1: Check if server is running
    console.log("1️⃣ Testing server connectivity...");
    const url = new URL(LM_BASE_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const healthCheck = new Promise((resolve, reject) => {
      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: "/health",
          method: "GET",
          timeout: 5000,
        },
        (res) => {
          resolve(res.statusCode);
        }
      );

      req.on("error", reject);
      req.on("timeout", () => reject(new Error("Connection timeout")));
      req.end();
    });

    await healthCheck;
    console.log("✅ Server is running\n");

    // Test 2: Test chat completions
    console.log("2️⃣ Testing chat completions...");
    const chatResponse = await fetch(`${LM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LM_MODEL,
        messages: [
          {
            role: "user",
            content:
              'Hello! Please respond with "Test successful" if you can read this.',
          },
        ],
        max_tokens: 50,
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(
        `Chat API error: ${chatResponse.status} ${chatResponse.statusText}`
      );
    }

    const chatData = await chatResponse.json();
    console.log("✅ Chat completions working");
    console.log(`📝 Response: ${chatData.choices[0].message.content}\n`);

    // Test 3: Test embeddings
    console.log("3️⃣ Testing embeddings...");
    const embeddingResponse = await fetch(`${LM_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "This is a test embedding.",
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(
        `Embedding API error: ${embeddingResponse.status} ${embeddingResponse.statusText}`
      );
    }

    const embeddingData = await embeddingResponse.json();
    console.log("✅ Embeddings working");
    console.log(
      `📊 Embedding dimensions: ${embeddingData.data[0].embedding.length}\n`
    );

    console.log(
      "🎉 All tests passed! Your local LLM is ready to use with Docugent."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Make sure your local LLM server is running");
    console.log("2. Check that the server URL is correct");
    console.log("3. Verify the model name matches your server");
    console.log("4. Ensure the server supports OpenAI-compatible API");
    process.exit(1);
  }
}

testConnection();
