import { Groq } from "groq-sdk";
import { NextRequest } from "next/server";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

// Initialize database path
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "..", "data", "db.json");

// Ensure data directory exists
if (!existsSync(dirname(file))) {
  mkdirSync(dirname(file), { recursive: true });
}

// Data types
interface Message {
  userToken: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
  id: string; // Unique identifier for each message
}

interface Schema {
  chats: {
    history: Message[];
  };
  settings: {
    maxHistoryLength: number;
    defaultModel: string;
    temperature: number;
  };
}

// Default database structure
const defaultDB: Schema = {
  chats: {
    history: [],
  },
  settings: {
    maxHistoryLength: 100,
    defaultModel: "gemma2-9b-it",
    temperature: 0.7,
  },
};

// Initialize adapter and database
const adapter = new JSONFile<Schema>(file);
const db = new Low<Schema>(adapter, defaultDB);

// Helper function to cleanup old messages
function cleanChatFromUserToken(userToken: string): Message[] {
  if (userToken === "no-token") {
    return [...db.data.chats.history]; // Do not clean if no token is provided
  }

  const sortedMessages = [...db.data.chats.history].filter(
    (message) => message.userToken !== userToken
  );
  return sortedMessages;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userToken } = body;

  if (!userToken) {
    return Response.json(
      { error: "Missing or invalid 'userToken'" },
      { status: 400 }
    );
  }

  // Ensure data is loaded
  await db.read();

  // Initialize db structure if empty
  if (!db.data) {
    db.data = defaultDB;
  }
  console.log("Database loaded:", db.data);
  //return
  db.data.chats.history = cleanChatFromUserToken(userToken);

  // Save to database
  await db.write();

  return Response.json({
    message: "Database loaded successfully",
    history: db.data,
  });
}
