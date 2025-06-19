import { Groq } from "groq-sdk";
import { NextRequest } from "next/server";

// Bộ nhớ tạm để lưu hội thoại
const conversationMemory = new Map<
  string,
  Array<{ role: "system" | "user" | "assistant"; content: string }>
>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body.message;
  const userToken = body.userToken;

  if (!message || !userToken) {
    return Response.json(
      { error: "Missing 'message' or 'userToken'" },
      { status: 400 }
    );
  }

  const previousMessages = conversationMemory.get(userToken) || [
    {
      role: "system",
      content:
        "You are a helpful assistant that replies in a storytelling manner.",
    },
  ];

  // Thêm message mới của user vào hội thoại
  previousMessages.push({ role: "user", content: message });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: previousMessages,
    });

    const reply =
      response.choices[0]?.message?.content || "No response from AI.";

    // Lưu phản hồi từ AI vào lịch sử
    previousMessages.push({ role: "assistant", content: reply });
    conversationMemory.set(userToken, previousMessages);

    return Response.json({ message: reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: "Unknown error" }, { status: 500 });
  }
}
