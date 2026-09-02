const mongoose = require("mongoose");

/**
 * Connects the Express application to MongoDB Atlas using Mongoose.
 * 
 * WHY THIS IS ASYNC:
 * Connecting to a database over the network takes time (DNS lookup, SSL handshake, authentication).
 * We use async/await so the server waits for a successful connection before proceeding.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If the database fails to connect, the server cannot function properly.
    // process.exit(1) terminates the Node process with an error code (1 = failure).
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
 