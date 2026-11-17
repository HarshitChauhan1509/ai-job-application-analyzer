import { openai } from "./client";

export interface GenerateFollowUpParams {
  candidateName: string;
  companyName: string;
  roleTitle: string;
  recipientName?: string;
  previousSubject?: string;
  followUpSequenceNumber: number; // 1 for first follow-up, 2 for second, etc.
  portfolioUrl?: string | null;
  keyProjects?: { name: string; description: string; stars?: number }[];
}

export interface FollowUpNudgeResult {
  subject: string;
  variationA: {
    label: string;
    body: string;
    rationale: string;
  };
  variationB: {
    label: string;
    body: string;
    rationale: string;
  };
  recommendedWaitDays: number;
}

export function generateFallbackFollowUp(params: GenerateFollowUpParams): FollowUpNudgeResult {
  const {
    candidateName,
    companyName,
    roleTitle,
    recipientName = "there",
    previousSubject,
    followUpSequenceNumber,
    portfolioUrl,
    keyProjects = [],
  } = params;

  const subject = previousSubject
    ? `Re: ${previousSubject.replace(/^Re:\s*/i, "")}`
    : `Following up: ${roleTitle} at ${companyName}`;

  const topProject = keyProjects[0];
  const projectMention = topProject
    ? `Since my last note, I also published ${topProject.name} (${topProject.description}) which directly tackles similar architecture demands.`
    : `I've been continuing to build full-stack projects aligned with your tech stack.`;

  const portfolioSignature = portfolioUrl
    ? `\n\nLive Proof of Work: ${portfolioUrl}`
    : "";

  if (followUpSequenceNumber >= 2) {
    return {
      subject,
      variationA: {
        label: "Graceful Final Check-in",
        body: `Hi ${recipientName},

Hope you're having a productive week.

I wanted to quickly bump my note from last week regarding the ${roleTitle} opportunity at ${companyName}. I understand priorities shift quickly and your inbox is likely packed.

If the timing isn't right, no problem at all! If you are still exploring candidates who love shipping robust, user-centric software, I'd still love to connect for 10 minutes.${portfolioSignature}

Best,
${candidateName}`,
        rationale: "Acknowledges busy schedules with zero pressure while leaving the door wide open.",
      },
      variationB: {
        label: "Quick Value Add & Resource",
        body: `Hi ${recipientName},

Following up briefly on my previous email. ${projectMention}

Would you or the engineering lead be open to a 10-minute sync this Thursday or Friday to discuss how I can contribute to ${companyName}?${portfolioSignature}

Thanks,
${candidateName}`,
        rationale: "Brings fresh project momentum and suggests specific days to reduce scheduling friction.",
      },
      recommendedWaitDays: 5,
    };
  }

  // Sequence 1: First follow-up nudge (3-5 days after initial pitch)
  return {
    subject,
    variationA: {
      label: "Polite Nudge & New Metric",
      body: `Hi ${recipientName},

I know you have a hundred things on your plate, so I wanted to float this to the top of your inbox.

I'm very excited about what ${companyName} is building. ${projectMention}

Are you open to a brief 10-minute chat this week to see if my background matches your current engineering goals?${portfolioSignature}

Best regards,
${candidateName}`,
      rationale: "Friendly, ultra-concise (<75 words), and reinforces technical alignment.",
    },
    variationB: {
      label: "Short & Direct 3-Sentence Nudge",
      body: `Hi ${recipientName},

Just following up to see if you had a chance to review my note regarding the ${roleTitle} role.

I'd love the chance to share a couple of technical ideas on how I could hit the ground running with ${companyName}'s current stack.${portfolioSignature}

Looking forward to hearing your thoughts!

Best,
${candidateName}`,
      rationale: "Minimalist approach with lowest cognitive load for busy hiring leads.",
    },
    recommendedWaitDays: 4,
  };
}

export async function generateFollowUpNudge(
  params: GenerateFollowUpParams
): Promise<FollowUpNudgeResult> {
  const fallback = generateFallbackFollowUp(params);

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("dummy")) {
    return fallback;
  }

  try {
    const prompt = `You are an elite career advisor and startup recruiter.
Draft two concise, high-converting cold email follow-up nudges for a software engineering candidate.

Candidate Name: ${params.candidateName}
Company Name: ${params.companyName}
Target Role: ${params.roleTitle}
Recipient: ${params.recipientName || "Hiring Lead / Founder"}
Previous Subject: ${params.previousSubject || "Initial Outreach"}
Follow-Up Sequence: Follow-up #${params.followUpSequenceNumber} (sent ~${params.followUpSequenceNumber * 4} days after previous note)
Portfolio URL: ${params.portfolioUrl || "N/A"}
Top Project: ${params.keyProjects?.[0]?.name ? `${params.keyProjects[0].name}: ${params.keyProjects[0].description}` : "N/A"}

Rules:
1. Under 90 words per variation. Avoid corporate fluff, fake pleasantries, or passive-aggressive phrasing ("As per my last email").
2. Variation A: Polite Nudge & Fresh Context / Progress.
3. Variation B: Direct 3-sentence Value Add.
4. Return ONLY valid JSON with keys:
{
  "subject": "Re: ...",
  "variationA": { "label": "...", "body": "...", "rationale": "..." },
  "variationB": { "label": "...", "body": "...", "rationale": "..." },
  "recommendedWaitDays": 4
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || fallback.subject,
        variationA: parsed.variationA || fallback.variationA,
        variationB: parsed.variationB || fallback.variationB,
        recommendedWaitDays: parsed.recommendedWaitDays || fallback.recommendedWaitDays,
      };
    }

    return fallback;
  } catch (error) {
    console.warn("OpenAI follow-up nudge generation failed, using heuristic fallback:", error);
    return fallback;
  }
}
