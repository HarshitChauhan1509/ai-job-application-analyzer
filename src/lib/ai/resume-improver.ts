import { openai } from "./client";
import { ResumeImprovementSchema, ResumeImprovementOutput } from "./schema";

export type ImprovementAction = 
  | "IMPROVE" 
  | "MAKE_CONCISE" 
  | "MORE_TECHNICAL" 
  | "ADD_IMPACT" 
  | "TAILOR_TO_JOB";

export async function improveResumeBullet(
  originalBullet: string, 
  action: ImprovementAction,
  contextJobDescription?: string
): Promise<ResumeImprovementOutput> {
  let instruction = "";
  
  switch (action) {
    case "IMPROVE":
      instruction = "Improve this bullet point by making it more professional, active, and impactful.";
      break;
    case "MAKE_CONCISE":
      instruction = "Make this bullet point shorter and more concise without losing key technical details or impact.";
      break;
    case "MORE_TECHNICAL":
      instruction = "Enhance the technical depth of this bullet point. Emphasize the architecture, scale, tools, or complexity.";
      break;
    case "ADD_IMPACT":
      instruction = "Rewrite this bullet point to focus heavily on measurable business or technical impact (using the X-Y-Z formula if possible).";
      break;
    case "TAILOR_TO_JOB":
      instruction = `Tailor this bullet point to better align with the following job description context, highlighting relevant skills. Job Context: ${contextJobDescription?.substring(0, 500) || "None provided"}`;
      break;
  }

  const prompt = `
    You are an expert technical resume writer.
    
    Original Bullet Point: "${originalBullet}"
    
    Task: ${instruction}
    
    Provide the improved bullet point and a short explanation of what you changed and why.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a resume improvement engine. Always respond in valid JSON matching this exact structure:
        {
          "original": "Original text",
          "improved": "The newly written bullet point",
          "explanation": "Brief reasoning for the changes"
        }`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error("No response from AI");
  }

  try {
    const parsedData = JSON.parse(content);
    return ResumeImprovementSchema.parse(parsedData);
  } catch (error) {
    console.error("Failed to parse or validate Resume Improvement response", error, content);
    throw new Error("Invalid response format from AI");
  }
}
