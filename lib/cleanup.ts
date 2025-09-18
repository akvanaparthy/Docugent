// Cleanup utility for server shutdown
import { DocumentProcessor } from "./document-processor";

export async function cleanupAllDocuments(): Promise<void> {
  try {
    const processor = new DocumentProcessor();
    const documents = await processor.listDocuments();

    console.log(`Cleaning up ${documents.length} documents...`);

    for (const doc of documents) {
      await processor.cleanupDocument(doc.documentId);
    }

    console.log("All documents cleaned up successfully");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, cleaning up...");
  await cleanupAllDocuments();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, cleaning up...");
  await cleanupAllDocuments();
  process.exit(0);
});
