import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let connected = false;

export async function connect() {
  if (connected) return;
  await mongoose.connect(process.env.MONGO_URI);
  connected = true;
  console.log('Connected to MongoDB');
}

export async function disconnect() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
