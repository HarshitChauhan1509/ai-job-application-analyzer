import { openai } from "./client";
import { JobMatchSchema, JobMatchOutput } from "./schema";

export async function matchJobToResume(resumeText: string, jobDescriptionText: string): Promise<JobMatchOutput> {
  const prompt = `
    You are an expert technical recruiter and AI match engine.
    Compare the candidate's resume to the job description.
    
    Calculate accurate match scores (0-100) for overall fit, skills, experience, and keywords.
    List the strongest matching areas, missing skills (hard requirements or preferred skills that are absent),
    missing keywords, and provide actionable recommendations for tailoring the resume to this specific job.
    
    Job Description:
    """
    ${jobDescriptionText.substring(0, 4000)}
    """
    
    Resume:
    """
    ${resumeText.substring(0, 4000)}
    """
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a job match engine. Always respond in valid JSON matching this exact structure:
        {
          "overallScore": 85,
          "skillsScore": 90,
          "experienceScore": 80,
          "keywordsScore": 88,
          "strongMatches": ["strong match 1"],
          "missingSkills": ["missing skill 1"],
          "missingKeywords": ["missing keyword 1"],
          "recommendations": ["recommendation 1"]
        }`,
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
    return JobMatchSchema.parse(parsedData);
  } catch (error) {
    console.error("Failed to parse or validate Job Match response", error, content);
    throw new Error("Invalid response format from AI");
  }
}
