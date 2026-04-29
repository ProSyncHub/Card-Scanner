import mongoose from "mongoose";

let cached: { conn: any; promise: any } = { conn: null, promise: null };

export async function connectToDatabase() {
  const MONGODB_URI = process.env["MONGODB_URI"];
  if (!MONGODB_URI) {
    throw new Error("CRITICAL: Define the MONGODB_URI environment variable.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
