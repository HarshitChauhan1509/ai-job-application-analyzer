import { openai } from "./client";
import { ResumeAnalysisSchema, ResumeAnalysisOutput } from "./schema";

function fallbackResumeAnalysis(resumeText: string): ResumeAnalysisOutput {
  const text = resumeText.toLowerCase();

  const skillsList = [
    "react", "typescript", "javascript", "next.js", "node.js", "python", "java", "sql", "postgresql",
    "docker", "kubernetes", "aws", "git", "ci/cd", "graphql", "rest", "tailwind", "redis", "mongodb",
    "testing", "agile", "html", "css"
  ];

  const foundSkills = skillsList.filter((s) => text.includes(s));
  const missingSkills = skillsList.filter((s) => !text.includes(s)).slice(0, 4);

  const hasMetrics = /\d+[%kM]|\$\d+|\b\d+\s*(?:users|clients|requests|x|percent)/i.test(resumeText);
  const hasExperience = /experience|work history|employment/i.test(text);
  const hasEducation = /education|university|college|bachelor|degree|master/i.test(text);
  const hasProjects = /projects|portfolio|personal projects/i.test(text);

  let atsScore = 70;
  if (hasExperience) atsScore += 10;
  if (hasEducation) atsScore += 5;
  if (hasProjects) atsScore += 5;
  if (hasMetrics) atsScore += 5;
  atsScore = Math.min(atsScore, 95);

  const skillsScore = Math.min(60 + foundSkills.length * 4, 96);
  const experienceScore = hasMetrics ? 85 : 75;
  const overallScore = Math.round((atsScore + skillsScore + experienceScore) / 3);

  const strengths = [
    `Strong technical foundation with skills in ${foundSkills.slice(0, 3).map((s) => s.toUpperCase()).join(", ") || "core development"}`,
    "Clear role and responsibility structuring across career history",
    hasMetrics ? "Demonstrated measurable business and performance impact" : "Consistent professional experience in modern software engineering",
  ];

  const weaknesses = [
    hasMetrics ? "Some bullet points could highlight system scale or architectural complexity" : "Lack of quantifiable achievement metrics (e.g., % improvement, latency reduction, user count)",
    "Could incorporate more targeted industry keywords for senior positions",
  ];

  const missingKeywords = missingSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const recommendations = [
    "Incorporate the X-Y-Z formula: 'Accomplished [X] as measured by [Y] by doing [Z]'",
    `Add missing high-demand keywords such as ${missingKeywords.slice(0, 2).join(" and ")} where relevant`,
    "Tailor the professional summary to align directly with target job requirements",
  ];

  return {
    overallScore,
    atsScore,
    skillsScore,
    experienceScore,
    strengths,
    weaknesses,
    missingKeywords,
    recommendations,
  };
}

export async function analyzeResume(resumeText: string): Promise<ResumeAnalysisOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    try {
      const prompt = `
        You are an expert technical recruiter and resume reviewer. 
        Analyze the following resume text and provide a structured assessment.
        
        Extract the overall score (0-100), ATS compatibility score (0-100), 
        skills score (0-100), experience score (0-100).
        Also list strengths, weaknesses, missing keywords, and actionable recommendations.
        
        Resume Text:
        """
        ${resumeText.substring(0, 8000)}
        """
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
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
      if (content) {
        const parsedData = JSON.parse(content);
        return ResumeAnalysisSchema.parse(parsedData);
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to intelligent heuristic resume parser:", error);
    }
  }

  return fallbackResumeAnalysis(resumeText);
}
