import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";

// Initialize node-cache
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

// Data types
interface Message {
  userTokenId: string;
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
function cleanChatFromUserTokenId(
  userTokenId: string,
  messages: Message[]
): Message[] {
  if (userTokenId === "no-token") {
    return [...messages]; // Do not clean if no token is provided
  }

  const sortedMessages = [...messages].filter(
    (message) => message.userTokenId !== userTokenId
  );
  return sortedMessages;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userTokenId } = body;

  if (!userTokenId) {
    return NextResponse.json(
      { error: "Missing or invalid 'userTokenId'" },
      { status: 400 }
    );
  }

  // Get data from cache
  const db: Schema = cache.get("db") || defaultDB;

  // Clean chat history for the user
  db.chats.history = cleanChatFromUserTokenId(userTokenId, db.chats.history);

  // Save to cache
  cache.set("db", db);

  return NextResponse.json({
    message: "Chat history cleared successfully",
    history: db.chats.history,
  });
}
