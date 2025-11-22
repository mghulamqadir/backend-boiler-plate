// server.js
import 'dotenv/config';
import { connectDB } from './src/config/mongo.config.js';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Connect DB → Then start server
connectDB()
  .then(() => {
    console.log("⚡ DB connection complete. Starting server...");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server because DB connection failed:", error.message);
    process.exit(1);
  });
