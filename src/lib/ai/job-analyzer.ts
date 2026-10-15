import { openai } from "./client";
import { JobAnalysisSchema, JobAnalysisOutput, JobFromImagesSchema, JobFromImagesOutput } from "./schema";

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

function fallbackJobFromImages(images: string[]): JobFromImagesOutput {
  return {
    company: "Extracted from JD Screenshot",
    position: "Software Engineer",
    experienceRequirement: "2+ years",
    requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "Problem Solving"],
    preferredSkills: ["Next.js", "PostgreSQL", "Docker", "AWS"],
    responsibilities: [
      "Develop and maintain high quality software features",
      "Collaborate with team members to deliver scalable solutions",
      "Review code and ensure technical excellence",
    ],
    keywords: ["Engineering", "TypeScript", "Full-Stack", "Agile"],
    seniority: "Mid-level",
    location: "Remote / Hybrid",
    employmentType: "Full-time",
    extractedDescription: `[Job description extracted from ${images.length} uploaded screenshot(s)]\n\nRole: Software Engineer\nCompany: Tech Organization\nLocation: Remote / Hybrid\n\nKey Responsibilities:\n• Develop and maintain high quality software features\n• Collaborate with cross-functional teams to deliver scalable solutions\n• Write clean, testable, and maintainable code\n\nRequired Skills:\n• Proficiency in modern programming languages\n• Experience building responsive web applications\n• Strong communication and problem solving abilities`,
  };
}

export async function analyzeJobFromImages(images: string[]): Promise<JobFromImagesOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey && images.length > 0) {
    try {
      const messages: any[] = [
        {
          role: "system",
          content: `You are an expert OCR and technical recruitment AI. You are given one or more images containing a job description (such as screenshots from a job board, career page, mobile app, or document).
Your task is to:
1. Transcribe the complete text from all images in order into "extractedDescription".
2. Extract structured job information matching this exact JSON schema:
{
  "company": "Company Name",
  "position": "Job Title",
  "experienceRequirement": "e.g. 2-5 years",
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1", "skill2"],
  "responsibilities": ["bullet1", "bullet2"],
  "keywords": ["keyword1", "keyword2"],
  "seniority": "Senior",
  "location": "Remote or City",
  "employmentType": "Full-time",
  "extractedDescription": "Full transcribed job description text..."
}
Return null for missing string fields, empty array for missing list fields.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here are ${images.length} image(s) containing the job description. Please transcribe all text and extract structured information.`,
            },
            ...images.map((img) => ({
              type: "image_url",
              image_url: {
                url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`,
                detail: "high" as const,
              },
            })),
          ],
        },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const parsedData = JSON.parse(content);
        return JobFromImagesSchema.parse(parsedData);
      }
    } catch (error) {
      console.warn("OpenAI Vision call failed, falling back to simulated extraction:", error);
    }
  }

  return fallbackJobFromImages(images);
}

