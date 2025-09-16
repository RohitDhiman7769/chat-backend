import { MongoClient } from 'mongodb';
import dotenv from 'dotenv'
dotenv.config();

const uri =
  process.env.MONGO_URI ||
  `mongodb+srv://${process.env.AUTH_USERNAME}:${process.env.PASSWORD}@cluster0.hy8a5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

export async function connectDB() {
  try {
    if (!db) {
      await client.connect();
      db = client.db('Chat-hubb');
      console.log('Connected to MongoDB');
    }
    return db;
  } catch (err) {
    console.log('working',err)
    throw err;
  }
}

// export { client };
export { db };
export default client;
