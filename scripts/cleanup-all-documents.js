#!/usr/bin/env node

/**
 * Cleanup All Documents Script
 *
 * This script deletes all documents from MongoDB collections.
 * Use with caution - this will remove ALL data!
 *
 * Usage:
 *   node scripts/cleanup-all-documents.js
 */

const { MongoClient } = require("mongodb");

async function cleanupAllDocuments() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();

    const db = client.db(process.env.MONGODB_DATABASE);
    const documentsCollection = db.collection("documents");
    const metadataCollection = db.collection("metadata");

    console.log("Deleting all documents...");

    // Delete all documents from both collections
    const documentsResult = await documentsCollection.deleteMany({});
    const metadataResult = await metadataCollection.deleteMany({});

    console.log(
      `✅ Deleted ${documentsResult.deletedCount} documents from 'documents' collection`
    );
    console.log(
      `✅ Deleted ${metadataResult.deletedCount} documents from 'metadata' collection`
    );
    console.log("🎉 All documents cleaned up successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupAllDocuments();
}

module.exports = { cleanupAllDocuments };
