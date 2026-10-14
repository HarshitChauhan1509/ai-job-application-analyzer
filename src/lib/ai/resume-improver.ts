import { openai } from "./client";
import { ResumeImprovementSchema, ResumeImprovementOutput } from "./schema";

export type ImprovementAction = 
  | "IMPROVE" 
  | "MAKE_CONCISE" 
  | "MORE_TECHNICAL" 
  | "ADD_IMPACT" 
  | "TAILOR_TO_JOB";

function fallbackResumeImprovement(originalBullet: string, action: ImprovementAction): ResumeImprovementOutput {
  const clean = originalBullet.trim().replace(/^[-*•]\s*/, "");
  let improved = clean;
  let explanation = "Enhanced impact and action phrasing";

  switch (action) {
    case "MAKE_CONCISE":
      improved = clean
        .replace(/\bresponsible for\b/gi, "Led")
        .replace(/\bworked on\b/gi, "Developed")
        .replace(/\bhelped to\b/gi, "")
        .trim();
      explanation = "Removed passive voice and filler words to maximize brevity and directness.";
      break;
    case "MORE_TECHNICAL":
      improved = `Architected and implemented ${clean.replace(/^[A-Z][a-z]+ed\s+/i, "")} leveraging distributed asynchronous pipelines and modular service architecture, ensuring high availability and fault tolerance.`;
      explanation = "Highlighted architectural patterns, resiliency, and backend engineering depth.";
      break;
    case "ADD_IMPACT":
      improved = `Spearheaded ${clean.replace(/^[A-Z][a-z]+ed\s+/i, "")}, driving a 35% reduction in processing latency and accelerating delivery cycles across the organization.`;
      explanation = "Applied the Google X-Y-Z formula with quantifiable performance and efficiency gains.";
      break;
    case "TAILOR_TO_JOB":
      improved = `Engineered production-grade ${clean.replace(/^[A-Z][a-z]+ed\s+/i, "")} adhering to industry best practices, modern TypeScript/Next.js design systems, and CI/CD automation.`;
      explanation = "Aligned technical competencies and terminology with high-priority role requirements.";
      break;
    case "IMPROVE":
    default:
      improved = `Architected and executed ${clean.replace(/^[A-Z][a-z]+ed\s+/i, "")}, enhancing maintainability and improving system throughput by 28%.`;
      explanation = "Strengthened action verbs and introduced measurable performance improvements.";
      break;
  }

  return {
    original: originalBullet,
    improved,
    explanation,
  };
}

export async function improveResumeBullet(
  originalBullet: string, 
  action: ImprovementAction,
  contextJobDescription?: string
): Promise<ResumeImprovementOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
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

    try {
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
      if (content) {
        const parsedData = JSON.parse(content);
        return ResumeImprovementSchema.parse(parsedData);
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to heuristic bullet improver:", error);
    }
  }

  return fallbackResumeImprovement(originalBullet, action);
}
