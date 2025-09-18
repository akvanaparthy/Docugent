#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔍 Checking Docugent setup...\n");

// Check if required files exist
const requiredFiles = [
  "package.json",
  "next.config.js",
  "tsconfig.json",
  "tailwind.config.js",
  "vercel.json",
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/api/upload/route.ts",
  "app/api/process-url/route.ts",
  "app/api/query/route.ts",
  "app/api/health/route.ts",
  "lib/document-processor.ts",
  "middleware.ts",
];

let allFilesExist = true;

requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log("\n📦 Checking dependencies...");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const requiredDeps = [
  "next",
  "react",
  "react-dom",
  "ai",
  "@ai-sdk/openai",
  "pdf-parse",
  "mammoth",
  "cheerio",
  "axios",
  "uuid",
  "lucide-react",
  "tailwindcss",
];

requiredDeps.forEach((dep) => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}@${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

// Check environment file
console.log("\n🔐 Environment setup...");
if (fs.existsSync("env.example")) {
  console.log("✅ env.example exists");
} else {
  console.log("❌ env.example - MISSING");
  allFilesExist = false;
}

if (fs.existsSync(".env.local")) {
  console.log("✅ .env.local exists (remember to add your API keys)");
} else {
  console.log("⚠️  .env.local not found - create it from env.example");
}

console.log("\n" + "=".repeat(50));

if (allFilesExist) {
  console.log("🎉 Setup looks good! Ready for deployment.");
  console.log("\nNext steps:");
  console.log("1. Copy env.example to .env.local");
  console.log("2. Add your Vercel AI Gateway API key to .env.local");
  console.log("3. Run: npm install");
  console.log("4. Run: npm run dev (for local testing)");
  console.log("5. Deploy to Vercel following DEPLOYMENT.md");
} else {
  console.log(
    "❌ Setup incomplete. Please fix the missing files/dependencies."
  );
  process.exit(1);
}
