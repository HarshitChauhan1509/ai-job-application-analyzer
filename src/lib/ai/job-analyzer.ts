import { openai } from "./client";
import { JobAnalysisSchema, JobAnalysisOutput } from "./schema";

function fallbackJobAnalysis(jobDescription: string): JobAnalysisOutput {
  const text = jobDescription.trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Detect Company
  let company = "Tech Company";
  const companyMatch =
    text.match(/(?:at|join|about)\s+([A-Z][A-Za-z0-9&.,\- ]{2,30}?)(?:\s+(?:is looking|is hiring|team|,|\.|\n))/i) ||
    text.match(/Company(?:\s*:|\s+-)\s*([A-Za-z0-9&.,\- ]{2,30})/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  } else if (
    lines.length > 0 &&
    lines[0].length < 40 &&
    !lines[0].toLowerCase().includes("engineer") &&
    !lines[0].toLowerCase().includes("developer")
  ) {
    company = lines[0];
  }

  // 2. Detect Role / Position
  let position = "Software Engineer";
  const positionMatch =
    text.match(/(?:Role|Position|Job Title|Title)(?:\s*:|\s+-)\s*([A-Za-z0-9&.,\- /]{3,40})/i) ||
    text.match(
      /\b((?:Senior|Junior|Lead|Principal|Staff|Full\s*Stack|Frontend|Backend|DevOps|Data|Mobile|iOS|Android|Cloud|QA|Software|AI|ML)\s+(?:Software\s+)?(?:Engineer|Developer|Architect|Specialist|Manager|Designer))\b/i
    );
  if (positionMatch) {
    position = positionMatch[1].trim();
  } else if (lines.length > 0) {
    const roleLine = lines.find((l) => /engineer|developer|architect|designer|manager/i.test(l));
    if (roleLine && roleLine.length < 50) position = roleLine;
  }

  // 3. Detect Skills
  const knownSkills = [
    "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Python", "Java", "Go", "Golang", "Rust", "C++", "C#",
    ".NET", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "GraphQL",
    "REST", "HTML", "CSS", "Tailwind CSS", "Redux", "Kafka", "RabbitMQ", "CI/CD", "Git", "Linux", "Terraform", "Microservices"
  ];

  const foundSkills = knownSkills.filter((skill) => {
    const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });

  const requiredSkills = foundSkills.slice(0, 8);
  const preferredSkills = foundSkills.slice(8, 12);
  if (requiredSkills.length === 0) {
    requiredSkills.push("Software Development", "Problem Solving", "Collaboration");
  }

  // 4. Detect Experience
  const expMatch = text.match(/(\d+[\+]?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?)/i);
  const experienceRequirement = expMatch ? expMatch[1] : "3+ years";

  // 5. Seniority
  let seniority: string | null = "Mid-level";
  if (/senior|lead|principal|staff/i.test(position) || /senior|lead/i.test(text.substring(0, 300))) {
    seniority = "Senior";
  } else if (/junior|entry|intern/i.test(position) || /junior|entry/i.test(text.substring(0, 300))) {
    seniority = "Junior";
  }

  // 6. Location
  let location: string | null = "Remote";
  const locMatch =
    text.match(/(?:Location|Based in)(?:\s*:|\s+-)\s*([A-Za-z0-9, ]{3,30})/i) ||
    text.match(/\b(Remote|Hybrid|San Francisco|New York|London|Seattle|Austin|Toronto|Berlin|Bangalore|Singapore)\b/i);
  if (locMatch) {
    location = locMatch[1].trim();
  }

  // 7. Employment Type
  let employmentType: string | null = "Full-time";
  if (/\bpart[\s-]time\b/i.test(text)) employmentType = "Part-time";
  else if (/\bcontract\b/i.test(text)) employmentType = "Contract";
  else if (/\bintern(?:ship)?\b/i.test(text)) employmentType = "Internship";

  // 8. Responsibilities
  const bulletLines = lines.filter((l) => /^[-*•]\s+/.test(l)).map((l) => l.replace(/^[-*•]\s+/, ""));
  const responsibilities = bulletLines.slice(0, 5);
  if (responsibilities.length === 0) {
    responsibilities.push(
      `Develop and maintain features for the core ${position} domain`,
      "Collaborate with cross-functional teams to design scalable solutions",
      "Write clean, testable, and maintainable code"
    );
  }

  // 9. Keywords
  const keywords = Array.from(new Set([...requiredSkills, seniority || "Engineering", location || "Remote", "Agile", "Testing"])).slice(0, 8);

  return {
    company,
    position,
    experienceRequirement,
    requiredSkills,
    preferredSkills,
    responsibilities,
    keywords,
    seniority,
    location,
    employmentType,
  };
}

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysisOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    try {
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
      if (content) {
        const parsedData = JSON.parse(content);
        return JobAnalysisSchema.parse(parsedData);
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to intelligent heuristic parser:", error);
    }
  }

  // Return intelligent heuristic extraction when OpenAI key is absent or API fails
  return fallbackJobAnalysis(jobDescription);
}
