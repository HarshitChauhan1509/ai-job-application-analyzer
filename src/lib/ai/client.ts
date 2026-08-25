import OpenAI from "openai";

// Validate API key exists to prevent silent failures
if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV === "production") {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build",
});
