import mongoose from 'mongoose';

const DB_URI = process.env.DB_URI;

if (!DB_URI) {
  throw new Error('Missing DB_URI environment variable');
}

async function connectWithRetry() {
  let attempt = 0;
  const maxRetries = 5; // Max retry attempts
  const retryDelay = 5000; // Retry delay in (5 seconds)

  while (attempt < maxRetries) {
    try {
      const conn = await mongoose.connect(DB_URI, {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 60000, // 1 min max idle before mongodb clears unused connection
        waitQueueTimeoutMS: 5000, // Don't let clients wait forever
        socketTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000, // 30s timeout to connect mongodb
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      break;
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt}: MongoDB connection error:`, error.message);

      if (attempt === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1); // Exit if max retries are reached
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

export async function connectDB() {
  await connectWithRetry();
}