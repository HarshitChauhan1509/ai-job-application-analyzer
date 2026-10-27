"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  Minimize2,
  Maximize2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { sendCopilotMessageAction, CopilotMessage } from "@/app/actions/copilot";

const QUICK_PROMPTS = [
  "💼 How do I negotiate startup equity vs base salary?",
  "⏱️ Follow-up email template for a recruiter who hasn't replied",
  "🎯 3 tough technical interview questions for my target role",
  "🚀 How to pitch a YC founder with my GitHub proof-of-work",
];

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your **CareerPilot Copilot**. I can help you prepare for technical rounds, negotiate startup equity, draft high-converting founder pitches, or evaluate job offers. What's on your mind today?",
    },
  ]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const newMessages: CopilotMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await sendCopilotMessageAction({
        message: text,
        history: messages.slice(-5),
      });

      if (res.success && res.reply) {
        setMessages([...newMessages, { role: "assistant", content: res.reply }]);
      } else {
        toast({
          title: "Copilot Error",
          description: res.error || "Could not retrieve response from Copilot.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Connection Error",
        description: err.message || "Failed to communicate with AI Copilot.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedIndex(idx);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Thread reset. What career topic, technical interview question, or outreach pitch should we tackle next?",
      },
    ]);
  };

  // Helper to format basic markdown (bold, lists, headers)
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, lineIdx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={lineIdx} className="font-bold text-sm text-foreground mt-2 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={lineIdx}
            className="border-l-2 border-primary/50 pl-2.5 my-1.5 italic text-[11px] text-muted-foreground bg-muted/30 py-1 rounded-r"
          >
            {line.replace("> ", "")}
          </blockquote>
        );
      }
      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <li key={lineIdx} className="ml-3 list-disc text-xs leading-relaxed my-0.5">
            {line.substring(2)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={lineIdx} className="ml-3 list-decimal text-xs leading-relaxed my-0.5">
            {line.replace(/^\d+\.\s/, "")}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      // Simple inline bold replacement
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lineIdx} className="text-xs leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Pill Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all border border-primary-foreground/20 cursor-pointer"
          title="Open AI Career Copilot"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-semibold tracking-tight">AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[85vh] rounded-2xl shadow-2xl border border-border/80 bg-card/95 backdrop-blur-md flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">CareerPilot Copilot</h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-semibold">
                    AI Agent
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Startup Strategy &amp; Interview Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Restart Conversation"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Minimize Copilot"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] rounded-xl p-3 shadow-2xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/60 text-foreground border border-border/50"
                  }`}
                >
                  <div className="space-y-1">{renderFormattedContent(msg.content)}</div>

                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground"
                      title="Copy response"
                    >
                      {copiedIndex === idx ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-6 w-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
                <div className="bg-muted/60 border border-border/50 rounded-xl p-3 flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Thinking strategically...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (when few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-3 pb-2 pt-1 border-t border-border/40 bg-muted/20">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 px-1">
                Suggested Topics:
              </span>
              <div className="flex flex-col gap-1">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-[11px] p-1.5 rounded-lg border border-border/50 bg-background/80 hover:bg-muted text-foreground transition-colors truncate"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t border-border/70 bg-card shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about interviews, equity, pitches..."
                disabled={isLoading}
                className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim()}
                className="h-8 w-8 p-0 rounded-xl shrink-0"
              >
                <Send size={13} />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
