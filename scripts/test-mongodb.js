const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

async function testMongoDBConnection() {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://docugent-user:<db_password>@docugent-cluster.utfodrg.mongodb.net/?retryWrites=true&w=majority&appName=docugent-cluster";
  const dbName = process.env.MONGODB_DATABASE || "docugent";

  console.log("Testing MongoDB connection...");
  console.log("URI:", uri.replace(/\/\/.*@/, "//***:***@")); // Hide credentials
  console.log("Database:", dbName);

  let client;
  try {
    // Create MongoDB client
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Connect to MongoDB
    await client.connect();
    console.log("✅ Connected to MongoDB successfully!");

    // Get database
    const db = client.db(dbName);
    console.log("✅ Database accessed successfully!");

    // Test collections
    const collections = await db.listCollections().toArray();
    console.log(
      "📊 Existing collections:",
      collections.map((c) => c.name)
    );

    // Test insert/read
    const testCollection = db.collection("test");
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: "MongoDB connection test successful!",
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log("✅ Test document inserted:", insertResult.insertedId);

    const findResult = await testCollection.findOne({ test: true });
    console.log("✅ Test document retrieved:", findResult);

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log("✅ Test document cleaned up");

    console.log("\n🎉 MongoDB Atlas connection test completed successfully!");
    console.log("Your database is ready for Docugent.");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    if (error.message.includes("authentication failed")) {
      console.log("\n💡 Authentication failed. Please check:");
      console.log("1. Username: docugent-user");
      console.log(
        "2. Password: Make sure you replaced <db_password> with your actual password"
      );
      console.log(
        '3. Database user has "Read and write to any database" privileges'
      );
    } else if (error.message.includes("network")) {
      console.log("\n💡 Network access denied. Please check:");
      console.log("1. IP Access List includes 0.0.0.0/0 (allow from anywhere)");
      console.log("2. Or add Vercel's IP ranges for better security");
    } else if (error.message.includes("MONGODB_URI")) {
      console.log("\n💡 Environment variable not set. Please:");
      console.log(
        "1. Replace <db_password> in the connection string with your actual password"
      );
      console.log("2. Set MONGODB_URI environment variable");
    }

    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
}

// Run the test
testMongoDBConnection().catch(console.error);
