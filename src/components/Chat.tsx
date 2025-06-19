"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquarePlus } from "lucide-react";
import axios from "axios";
import Markdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const AIResponse = await axios.post("/api/groq-test", {
        message: input.trim(),
        userToken: `${window.localStorage.getItem("token") || ""}`,
      });

      console.log(AIResponse.data);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: AIResponse.data.message || "No response from AI.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (error: unknown) {
      console.log("Error:", error);

      let errorMessage = "No response from AI.";

      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: errorMessage,
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMessage = async () => {
    /// reset
    setMessages([]);
    setInput("");
    setIsLoading(false);
    /// call API

    const resData = await axios.post("/api/delChat", {
      userToken: `${window.localStorage.getItem("token") || "no-token"}`,
    });
    console.log("New message response:", resData.data);
  };

  return (
    <div className="flex flex-col w-full max-h-screen h-screen mx-auto bg-black/20">
      {/* Messages container */}
      {messages.length === 0 && (
        <p className=" fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] text-gray-700 text-xl">
          HÃY NÓI THEO CÁCH CỦA TÔI
        </p>
      )}
      <span
        onClick={handleNewMessage}
        className="fixed z-10 hover:opacity-75 top-0 left-0 p-2 rounded-full m-2 cursor-pointer bg-gradient-to-r from-[#FC466B] to-[#3F5EFB] text-white shadow-lg transition-all duration-300 "
      >
        <MessageSquarePlus />
      </span>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                relative max-w-[80%] md:max-w-[70%] p-3 rounded
                ${
                  message.isUser
                    ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.1)]"
                }
                transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]
              `}
            >
              <div className="text-sm md:text-base break-words">
                <Markdown>{message.content}</Markdown>
              </div>
              <span
                className={`absolute -bottom-5 text-xs opacity-50 whitespace-nowrap ${
                  message.isUser ? "right-0" : "left-0"
                }`}
              >
                {message.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-fuchsia-500/20 border border-fuchsia-500/30 p-3 rounded">
              <Loader2 className="w-4 h-4 text-fuchsia-300 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-cyan-500/20  relative bottom-0"
      >
        <div className="relative flex justify-center items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-4 py-3 rounded bg-gray-900/50 
              border border-cyan-500/30 text-cyan-300 
              placeholder-cyan-300/30 focus:outline-none 
              focus:border-cyan-500/70 focus:ring-1 
              focus:ring-cyan-500/70 transition-all 
              shadow-[0_0_10px_rgba(34,211,238,0.1)]
              focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              p-2 rounded-full transition-all duration-300
              ${
                input.trim() && !isLoading
                  ? "bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-300"
                  : "bg-gray-800/50 border border-gray-700 text-gray-500"
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
