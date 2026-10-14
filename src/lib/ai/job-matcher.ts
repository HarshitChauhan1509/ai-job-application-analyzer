import { openai } from "./client";
import { JobMatchSchema, JobMatchOutput } from "./schema";

function fallbackJobMatch(resumeText: string, jobDescriptionText: string): JobMatchOutput {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescriptionText.toLowerCase();

  const techSkills = [
    "react", "typescript", "javascript", "next.js", "node.js", "python", "java", "sql", "postgresql",
    "docker", "kubernetes", "aws", "git", "ci/cd", "graphql", "rest", "tailwind", "redis", "mongodb",
    "microservices", "testing", "agile", "html", "css", "c++", "golang", "go"
  ];

  const jobSkills = techSkills.filter((s) => jobLower.includes(s));
  const resumeSkills = techSkills.filter((s) => resumeLower.includes(s));

  const matched = jobSkills.filter((s) => resumeSkills.includes(s));
  const missing = jobSkills.filter((s) => !resumeSkills.includes(s));

  const strongMatches = matched.map((s) => `Demonstrated hands-on proficiency in ${s.toUpperCase()}`);
  if (strongMatches.length === 0) {
    strongMatches.push("Foundational software engineering principles and problem-solving");
  }

  const missingSkills = missing.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  const missingKeywords = missingSkills.slice(0, 4);

  const skillsScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 75;
  const experienceScore = 80;
  const keywordsScore = Math.min(65 + matched.length * 7, 95);
  const overallScore = Math.round((skillsScore * 0.4) + (experienceScore * 0.3) + (keywordsScore * 0.3));

  const recommendations = [
    missingSkills.length > 0
      ? `Highlight any practical experience or coursework with ${missingSkills.slice(0, 2).join(" and ")}`
      : "Align project bullet points directly with the responsibilities in this job description",
    "Quantify your accomplishments with measurable metrics (e.g. latency, user volume, uptime)",
    "Mirror the specific terminology used in the job requirements throughout your summary section",
  ];

  return {
    overallScore,
    skillsScore,
    experienceScore,
    keywordsScore,
    strongMatches,
    missingSkills,
    missingKeywords,
    recommendations,
  };
}

export async function matchJobToResume(resumeText: string, jobDescriptionText: string): Promise<JobMatchOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    try {
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
      if (content) {
        const parsedData = JSON.parse(content);
        return JobMatchSchema.parse(parsedData);
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to heuristic job matcher:", error);
    }
  }

  return fallbackJobMatch(resumeText, jobDescriptionText);
}
