import { Groq } from "groq-sdk";
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
function cleanupOldMessages(messages: Message[], maxLength: number): Message[] {
  if (messages.length <= maxLength) return messages;
  const sortedMessages = [...messages].sort(
    (a, b) => b.timestamp - a.timestamp
  );
  return sortedMessages.slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, userToken } = body;

  if (!userToken) {
    return NextResponse.json(
      { error: "Không tìm thấy TOKEN, bro ơi đừng..." },
      { status: 400 }
    );
  }
  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid 'message'" },
      { status: 400 }
    );
  }

  // Get data from cache
  const db: Schema = cache.get("db") || defaultDB;

  try {
    // System message defines AI behavior
    const systemMessage = {
      role: "system" as const,
      content:
        "Your creator is Pillrock, a programmer born in 2006 named PTĐ. You are helpful, concise, and friendly.",
    };

    // Get conversation history for the user
    const userHistory = db.chats.history
      .filter((msg) => msg.userToken === userToken)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10); // Only use last 10 messages for context

    const conversationMessages = [
      systemMessage,
      ...userHistory.map(({ role, content }) => ({ role, content })),
      { role: "user" as const, content: message },
    ];

    // Call Groq API
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string });
    const completion = await groq.chat.completions.create({
      model: db.settings.defaultModel,
      messages: conversationMessages,
      temperature: db.settings.temperature,
    });

    const reply =
      completion.choices[0]?.message?.content || "No response from AI.";

    // Create new messages
    const newMessages: Message[] = [
      {
        userToken,
        role: "user",
        content: message,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
      },
      {
        userToken,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
      },
    ];

    // Add new messages and cleanup if needed
    db.chats.history = cleanupOldMessages(
      [...db.chats.history, ...newMessages],
      db.settings.maxHistoryLength
    );

    // Save to cache
    cache.set("db", db);

    return NextResponse.json({
      status: 200,
      message: reply,
      messageId: newMessages[1].id, // Return assistant's message ID
      timestamp: newMessages[1].timestamp,
    });
  } catch (error: unknown) {
    console.error("Error in /api/groq-test:", error);

    // Check if error is due to context length
    if (
      error instanceof Error &&
      error.message.includes("context_length_exceeded")
    ) {
      // Reduce history and try again with shorter context
      db.chats.history = cleanupOldMessages(
        db.chats.history,
        Math.floor(db.settings.maxHistoryLength / 2)
      );
      cache.set("db", db);

      return NextResponse.json(
        {
          error: "Đoạn chat dài quá rồi bro.",
          shouldRetry: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        shouldRetry: false,
      },
      { status: 500 }
    );
  }
}
