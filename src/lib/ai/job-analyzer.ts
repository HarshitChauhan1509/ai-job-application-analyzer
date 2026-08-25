import { openai } from "./client";
import { JobAnalysisSchema, JobAnalysisOutput } from "./schema";

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysisOutput> {
  const prompt = `
    You are an expert technical recruiter. Analyze the following job description 
    and extract structured information about the role.
    
    Job Description:
    """
    ${jobDescription.substring(0, 8000)}
    """
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a job analysis engine. Always respond in valid JSON matching this exact structure:
        {
          "company": "Company Name",
          "position": "Job Title",
          "experienceRequirement": "e.g. 3-5 years",
          "requiredSkills": ["skill1", "skill2"],
          "preferredSkills": ["skill1", "skill2"],
          "responsibilities": ["resp1", "resp2"],
          "keywords": ["keyword1", "keyword2"],
          "seniority": "Senior",
          "location": "Remote",
          "employmentType": "Full-time"
        }
        Return null for string fields if not mentioned. Return empty array for array fields if none found.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error("No response from AI");
  }

  try {
    const parsedData = JSON.parse(content);
    return JobAnalysisSchema.parse(parsedData);
  } catch (error) {
    console.error("Failed to parse or validate AI response", error, content);
    throw new Error("Invalid response format from AI");
  }
}
