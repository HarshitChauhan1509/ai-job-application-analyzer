import { openai } from "./client";
import { ResumeAnalysisSchema, ResumeAnalysisOutput } from "./schema";

export async function analyzeResume(resumeText: string): Promise<ResumeAnalysisOutput> {
  const prompt = `
    You are an expert technical recruiter and resume reviewer. 
    Analyze the following resume text and provide a structured assessment.
    
    Extract the overall score (0-100), ATS compatibility score (0-100), 
    skills score (0-100), experience score (0-100).
    Also list strengths, weaknesses, missing keywords, and actionable recommendations.
    
    Resume Text:
    """
    ${resumeText.substring(0, 8000)} // Truncate to avoid token limits if extremely long
    """
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo", // or gpt-4o
    messages: [
      {
        role: "system",
        content: "You are a resume analysis engine. Always respond in valid JSON matching the exact requested structure.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error("No response from AI");
  }

  // Parse and validate the response against our Zod schema
  try {
    const parsedData = JSON.parse(content);
    return ResumeAnalysisSchema.parse(parsedData);
  } catch (error) {
    console.error("Failed to parse or validate AI response", error, content);
    throw new Error("Invalid response format from AI");
  }
}
