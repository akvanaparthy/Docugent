import { MongoClient, Db } from "mongodb";

// MongoDB connection management
let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!process.env.MONGODB_DATABASE) {
    throw new Error("MONGODB_DATABASE environment variable is not set");
  }

  try {
    // Create new client if it doesn't exist
    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }

    // Connect to MongoDB
    await client.connect();

    // Get database
    db = client.db(process.env.MONGODB_DATABASE);

    console.log("Connected to MongoDB successfully");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
