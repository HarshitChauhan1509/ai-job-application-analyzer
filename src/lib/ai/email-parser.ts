import { openai } from "./client";

export type EmailStage = "SAVED" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface ParsedEmailResult {
  company: string;
  role: string;
  detectedStatus: EmailStage;
  statusLabel: string;
  summary: string;
  actionRequired: boolean;
  actionDetails?: string;
  interviewDate?: string;
  interviewType?: string;
  senderName?: string;
  confidence: number;
  rawSnippet: string;
}

/**
 * Heuristic fallback parser when AI API key is unavailable or during rate limits
 */
function parseEmailHeuristically(emailText: string): ParsedEmailResult {
  const textLower = emailText.toLowerCase();

  // 1. Detect Company
  let company = "Unknown Company";
  const companyPatterns = [
    /(?:at|with|join|team at|role at)\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?:[\r\n.,!?]| for | as )/,
    /Thank you for applying to\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?:[\r\n.,!?]| for )/i,
    /from\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?: Recruiting| Talent| Team| Careers)?(?:[\r\n.,!?])/i,
    /Welcome to\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?:!|[\r\n.,])/i,
    /@([a-zA-Z0-9\-]+)\.(?:com|io|co|ai|org|dev)/i,
  ];

  for (const pattern of companyPatterns) {
    const match = emailText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!["the", "our", "a", "an", "this", "your"].includes(candidate.toLowerCase())) {
        company = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  // 2. Detect Role
  let role = "Software Engineer";
  const rolePatterns = [
    /(?:position of|role of|application for|applied for the|opportunity as|role as)\s+([A-Za-z0-9/\- ]{3,45}?)(?:[\r\n.,!?]| at | with )/i,
    /([A-Z][A-Za-z0-9/\- ]{2,35}(?:Engineer|Developer|Manager|Designer|Lead|Scientist|Architect|Specialist|Analyst|Consultant))/i,
  ];

  for (const pattern of rolePatterns) {
    const match = emailText.match(pattern);
    if (match && match[1]) {
      role = match[1].trim();
      break;
    }
  }

  // 3. Detect Status & Stage
  let detectedStatus: EmailStage = "APPLIED";
  let statusLabel = "Application Acknowledged";
  let actionRequired = false;
  let actionDetails: string | undefined = undefined;
  let interviewType: string | undefined = undefined;

  if (
    textLower.includes("pleased to offer") ||
    textLower.includes("thrilled to offer") ||
    textLower.includes("formal offer") ||
    textLower.includes("offer letter") ||
    textLower.includes("congratulations on your offer")
  ) {
    detectedStatus = "OFFER";
    statusLabel = "Offer Extended 🎉";
    actionRequired = true;
    actionDetails = "Review formal offer letter and compensation terms.";
  } else if (
    textLower.includes("unfortunately") ||
    textLower.includes("not moving forward") ||
    textLower.includes("decided to pursue other") ||
    textLower.includes("other candidates") ||
    textLower.includes("at this time") ||
    textLower.includes("unable to offer you an interview")
  ) {
    detectedStatus = "REJECTED";
    statusLabel = "Application Closed";
    actionRequired = false;
  } else if (
    textLower.includes("interview") ||
    textLower.includes("calendly.com") ||
    textLower.includes("schedule a time") ||
    textLower.includes("coding challenge") ||
    textLower.includes("hackerrank") ||
    textLower.includes("codility") ||
    textLower.includes("technical screen") ||
    textLower.includes("hiring manager")
  ) {
    detectedStatus = "INTERVIEW";
    statusLabel = "Interview Invitation 📅";
    actionRequired = true;
    actionDetails = textLower.includes("calendly")
      ? "Select interview time slot on recruiter's calendar link."
      : "Reply with your upcoming schedule and availability.";
    
    if (textLower.includes("coding") || textLower.includes("hackerrank") || textLower.includes("assessment")) {
      interviewType = "Technical Assessment / Take-home";
    } else if (textLower.includes("screening") || textLower.includes("phone")) {
      interviewType = "Recruiter Screening Call";
    } else {
      interviewType = "Hiring Team Interview";
    }
  } else if (
    textLower.includes("phone screen") ||
    textLower.includes("recruiter screen") ||
    textLower.includes("quick 15-minute chat") ||
    textLower.includes("initial chat")
  ) {
    detectedStatus = "SCREENING";
    statusLabel = "Recruiter Screening";
    actionRequired = true;
    actionDetails = "Confirm availability for initial recruiter discussion.";
  } else {
    detectedStatus = "APPLIED";
    statusLabel = "Application Received";
    actionRequired = false;
  }

  // 4. Detect Date/Time
  let interviewDate: string | undefined = undefined;
  const dateMatch = emailText.match(/(?:on|at|for)\s+([A-Z][a-z]{2,8}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|est|pst|utc|gmt|cst|ist)?)?)/i);
  if (dateMatch && dateMatch[1]) {
    interviewDate = dateMatch[1].trim();
  }

  const snippet = emailText.length > 200 ? emailText.slice(0, 197) + "..." : emailText;

  return {
    company,
    role,
    detectedStatus,
    statusLabel,
    summary: `Email from ${company} regarding ${role}: status detected as ${statusLabel}.`,
    actionRequired,
    actionDetails,
    interviewDate,
    interviewType,
    confidence: 72,
    rawSnippet: snippet,
  };
}

/**
 * Main AI Recruiter Email Parser using GPT or fallback heuristics
 */
export async function parseApplicationEmail(emailText: string): Promise<ParsedEmailResult> {
  const cleanText = emailText.trim();
  if (!cleanText) {
    throw new Error("Email content is empty");
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "dummy-key-for-build") {
    return parseEmailHeuristically(cleanText);
  }

  try {
    const prompt = `You are an expert AI Career Assistant and Recruiter Email Parser.
Analyze the following email from a recruiter, ATS system, or hiring manager, and extract structured tracking metadata in JSON.

EMAIL TEXT:
"""
${cleanText}
"""

Strictly output valid JSON matching this schema:
{
  "company": "Company Name (e.g. Stripe, Linear, Figma, or Unknown)",
  "role": "Role Title (e.g. Senior Frontend Engineer, Full Stack Developer, or Software Engineer)",
  "detectedStatus": "One of: APPLIED | SCREENING | INTERVIEW | OFFER | REJECTED",
  "statusLabel": "Short human label (e.g. 'Interview Scheduled', 'Technical Screen', 'Application Received', 'Offer Extended', 'Application Closed')",
  "summary": "1 to 2 concise sentences summarizing the key updates, context, and next expectations.",
  "actionRequired": true/false (true if recruiter asks for availability, calendar booking, test submission, or offer response),
  "actionDetails": "Specific action instructions (e.g. 'Book 30-min slot via Calendly link', 'Complete HackerRank before Sunday') or null",
  "interviewDate": "Any specific scheduled date or time mentioned, or null",
  "interviewType": "'Recruiter Screen' | 'Technical Round' | 'System Design' | 'Take-home Assessment' | 'Culture Fit' | 'Final Round' | null",
  "senderName": "Name of recruiter/manager if identified, or null",
  "confidence": integer between 50 and 99
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional recruiting email analysis system. Always output strictly valid JSON with no markdown wrapping.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    const rawResponse = response.choices[0]?.message?.content?.trim();
    if (!rawResponse) {
      return parseEmailHeuristically(cleanText);
    }

    const cleanedJson = rawResponse.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanedJson);

    const validStatuses: EmailStage[] = ["SAVED", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"];
    const detectedStatus: EmailStage = validStatuses.includes(parsed.detectedStatus)
      ? parsed.detectedStatus
      : "APPLIED";

    const snippet = cleanText.length > 250 ? cleanText.slice(0, 247) + "..." : cleanText;

    return {
      company: parsed.company || "Unknown Company",
      role: parsed.role || "Software Engineer",
      detectedStatus,
      statusLabel: parsed.statusLabel || "Application Status Update",
      summary: parsed.summary || `Recruiter email from ${parsed.company || "company"}.`,
      actionRequired: Boolean(parsed.actionRequired),
      actionDetails: parsed.actionDetails || undefined,
      interviewDate: parsed.interviewDate || undefined,
      interviewType: parsed.interviewType || undefined,
      senderName: parsed.senderName || undefined,
      confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(50, parsed.confidence)) : 88,
      rawSnippet: snippet,
    };
  } catch (err) {
    console.warn("AI Email Parser API failed, using heuristic parser:", err);
    return parseEmailHeuristically(cleanText);
  }
}
