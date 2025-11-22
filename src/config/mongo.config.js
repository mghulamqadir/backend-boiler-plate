import mongoose from 'mongoose';
const DB_URI = process.env.DB_URI;

export async function connectDB() {
  let retry = 0;
  while (retry < 3) {
    try {
      const conn = await mongoose.connect(DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error('MongoDB connection error:', error.message);
      retry++;
      if (retry >= 3) {
        console.error('MongoDB connection failed after 3 retries');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
