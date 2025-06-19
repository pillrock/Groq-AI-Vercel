import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";

// Initialize node-cache
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

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

// Initialize cache if not already set
if (!cache.get("db")) {
  cache.set("db", defaultDB);
}

// Helper function to cleanup old messages
function cleanChatFromUserToken(
  userToken: string,
  messages: Message[]
): Message[] {
  if (userToken === "no-token") {
    return [...messages]; // Do not clean if no token is provided
  }

  const sortedMessages = [...messages].filter(
    (message) => message.userToken !== userToken
  );
  return sortedMessages;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userToken } = body;

  if (!userToken) {
    return NextResponse.json(
      { error: "Missing or invalid 'userToken'" },
      { status: 400 }
    );
  }

  // Get data from cache
  const db: Schema = cache.get("db") || defaultDB;

  // Clean chat history for the user
  db.chats.history = cleanChatFromUserToken(userToken, db.chats.history);

  // Save to cache
  cache.set("db", db);

  return NextResponse.json({
    message: "Chat history cleared successfully",
    history: db.chats.history,
  });
}
