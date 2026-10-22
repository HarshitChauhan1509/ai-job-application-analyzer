import { openai } from "./client";
import { ExperienceItem } from "@/app/actions/profile";

export interface OutreachPitchResult {
  founderPitch: {
    subject: string;
    body: string;
    tips: string;
  };
  hiringManagerPitch: {
    subject: string;
    body: string;
    tips: string;
  };
  linkedInNote: {
    text: string;
    characterCount: number;
    tips: string;
  };
}

export async function generateOutreachPitches(params: {
  candidateName: string;
  candidateHeadline?: string | null;
  candidateBio?: string | null;
  candidateSkills?: string[];
  candidateExperience?: ExperienceItem[];
  companyName: string;
  roleTitle: string;
  jobDescription?: string;
  recipientName?: string;
  portfolioUrl?: string | null;
}): Promise<OutreachPitchResult> {
  const {
    candidateName,
    candidateHeadline,
    candidateBio,
    candidateSkills = [],
    candidateExperience = [],
    companyName,
    roleTitle,
    jobDescription = "",
    recipientName = "Founder / Hiring Team",
    portfolioUrl,
  } = params;

  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  // Summarize top achievements from experience
  const recentRoles = candidateExperience.slice(0, 2).map((exp) => {
    return `${exp.title} at ${exp.company}: ${exp.description || ""} (Skills: ${exp.skills?.join(", ") || "General"})`;
  }).join("\n");

  const skillsStr = candidateSkills.slice(0, 8).join(", ") || "TypeScript, React, Next.js, Node.js, Cloud Architecture";

  if (hasValidKey) {
    const prompt = `
      You are a world-class startup career strategist who writes cold emails that get high reply rates from YC founders, CTOs, and tech leaders.

      Candidate Name: "${candidateName}"
      Candidate Headline: "${candidateHeadline || "Full Stack Engineer & Builder"}"
      Candidate Background: "${candidateBio || "Experienced software engineer specializing in scalable web systems."}"
      Top Skills: "${skillsStr}"
      Recent Experience / Projects:
      ${recentRoles || "Proven track record of building production web applications and APIs."}
      Portfolio Link: "${portfolioUrl || ""}"

      Target Company: "${companyName}"
      Target Role: "${roleTitle}"
      Job Context / Requirements: "${jobDescription.substring(0, 1500)}"
      Recipient: "${recipientName}"

      Generate 3 distinct, high-converting outreach messages tailored to this startup and candidate:

      1. FOUNDER DIRECT PITCH (Cold Email to Founder / CEO / CTO):
         - Subject line: Short, curiosity-piquing, lowercase or title style (e.g. "${roleTitle} @ ${companyName} - quick question re: [specific feature/tech]").
         - Body: 110-140 words max.
         - Avoid clichés like "I hope this email finds you well" or "I am writing to apply".
         - Immediately state what you admire about what ${companyName} is shipping.
         - Reference 1 or 2 specific candidate projects/proof-of-work that directly align with ${companyName}'s tech stack.
         - Mention portfolio link if provided.
         - Low-friction ask: 10-minute casual sync to talk architecture/product.

      2. HIRING MANAGER / TECH LEAD PITCH (InMail or Technical Cold Outreach):
         - Subject line: Professional, highlighting engineering alignment.
         - Body: 130-160 words max.
         - Focus on technical depth, metrics, architecture, and ability to hit the ground running without handholding.

      3. LINKEDIN CONNECTION NOTE:
         - MUST be strictly under 280 characters to comply with LinkedIn's 300-character invitation limit.
         - Genuine, punchy, references ${companyName}'s work, asks to connect.

      Respond ONLY in valid JSON matching this schema:
      {
        "founderPitch": {
          "subject": "...",
          "body": "...",
          "tips": "Send Tuesday-Thursday between 8am-10am recipient local time for highest open rates."
        },
        "hiringManagerPitch": {
          "subject": "...",
          "body": "...",
          "tips": "Attach your tailored resume and highlight your GitHub repository demos."
        },
        "linkedInNote": {
          "text": "...",
          "characterCount": 260,
          "tips": "Personalize the first sentence if you follow their recent launch posts."
        }
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert cold outreach strategist for engineering candidates. Respond only in valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const raw = response.choices[0].message?.content;
      if (raw) {
        const parsed = JSON.parse(raw) as OutreachPitchResult;
        if (parsed.founderPitch && parsed.hiringManagerPitch && parsed.linkedInNote) {
          parsed.linkedInNote.characterCount = parsed.linkedInNote.text.length;
          return parsed;
        }
      }
    } catch (error) {
      console.warn("OpenAI outreach generation failed, falling back to heuristic templates:", error);
    }
  }

  // High-converting heuristic templates
  const portfolioText = portfolioUrl ? `\n\nYou can review my interactive portfolio & recent builds here: ${portfolioUrl}` : "";
  const firstName = candidateName.split(" ")[0] || "there";

  const founderSubject = `${roleTitle} @ ${companyName} — quick question on your stack`;
  const founderBody = `Hi ${recipientName.split(" ")[0] || "there"},

I've been following what you're building at ${companyName} and love your team's focus on high-impact product execution.

As a ${candidateHeadline || roleTitle} with deep experience in ${skillsStr.split(",").slice(0, 3).join(", ")}, I've recently engineered systems solving similar scaling challenges—including reducing latency and delivering production-ready features.${portfolioText}

Would you be open to a brief 10-minute chat this Thursday or Friday to discuss where your engineering team is headed?

Best regards,
${candidateName}`;

  const techLeadSubject = `${candidateName} — ${roleTitle} candidate background & engineering fit`;
  const techLeadBody = `Hi ${recipientName.split(" ")[0] || "Team"},

I came across the ${roleTitle} opportunity at ${companyName} and wanted to reach out directly given the strong overlap with my technical background.

A quick summary of what I bring to the table:
• Expertise across ${skillsStr.split(",").slice(0, 4).join(", ")} with a focus on clean, scalable architecture.
• Experience building and shipping end-to-end features with high velocity and test coverage.
• Strong passion for ${companyName}'s product vision.${portfolioText}

I would welcome the opportunity to connect with you or the engineering lead for a quick conversation.

Thanks,
${candidateName}`;

  const linkedInText = `Hi ${recipientName.split(" ")[0] || "there"}! Big fan of what you're building at ${companyName}. As a ${candidateHeadline || "Software Engineer"} focused on ${skillsStr.split(",")[0] || "modern tech"}, I'd love to connect and follow your journey!`;

  return {
    founderPitch: {
      subject: founderSubject,
      body: founderBody,
      tips: "Send mid-morning Tuesday–Thursday. Keep follow-ups spaced 3–4 business days apart.",
    },
    hiringManagerPitch: {
      subject: techLeadSubject,
      body: techLeadBody,
      tips: "Mention specific open-source contributions or technical challenges you saw on their blog.",
    },
    linkedInNote: {
      text: linkedInText,
      characterCount: linkedInText.length,
      tips: "Keep under 300 characters. Mentioning a recent launch increases connection rates by 40%.",
    },
  };
}
