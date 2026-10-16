import { openai } from "./client";
import { ResumeImprovementSchema, ResumeImprovementOutput } from "./schema";

export type ImprovementAction = 
  | "IMPROVE" 
  | "MAKE_CONCISE" 
  | "MORE_TECHNICAL" 
  | "ADD_IMPACT" 
  | "TAILOR_TO_JOB"
  | "LEADERSHIP";

export interface BulletVariation {
  id: string;
  improved: string;
  explanation: string;
  style: "metric_driven" | "technical_depth" | "concise" | "leadership" | "ats_optimized";
  styleLabel: string;
  score: number;
}

export interface BulletAnalysis {
  wordCount: number;
  hasMetrics: boolean;
  hasStrongVerb: boolean;
  isWeakVerb: boolean;
  actionVerb: string | null;
  overallScore: number;
  feedback: string[];
}

export interface MultiVariationOutput {
  original: string;
  originalAnalysis: BulletAnalysis;
  variations: BulletVariation[];
}

const WEAK_VERB_PATTERNS = [
  /^(?:responsible for|responsibilities included)\b/i,
  /^(?:worked on|worked with)\b/i,
  /^(?:helped to|helped with|helped)\b/i,
  /^(?:assisted with|assisted in|assisted)\b/i,
  /^(?:participated in)\b/i,
  /^(?:handled)\b/i,
  /^(?:tasked with)\b/i,
  /^(?:involved in)\b/i,
  /^(?:did|made|supported)\b/i,
];

const STRONG_POWER_VERBS = [
  "Architected", "Spearheaded", "Engineered", "Orchestrated", "Accelerated",
  "Automated", "Pioneered", "Championed", "Overhauled", "Scaled", "Optimized",
  "Refactored", "Streamlined", "Deployed", "Implemented", "Executed", "Devised",
  "Consolidated", "Led", "Designed", "Formulated", "Transformed", "Standardized"
];

export function analyzeBullet(bullet: string): BulletAnalysis {
  const clean = bullet.trim().replace(/^[-*•]\s*/, "");
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Verb detection
  const firstWord = words[0] || "";
  const firstTwoWords = words.slice(0, 2).join(" ");

  const isWeak = WEAK_VERB_PATTERNS.some((p) => p.test(clean));
  const isStrong = STRONG_POWER_VERBS.some(
    (v) => v.toLowerCase() === firstWord.toLowerCase()
  );

  const actionVerb = isWeak ? firstTwoWords : firstWord || null;

  // Metrics check (%, $, numbers, latency, multipliers)
  const hasMetrics = /\d+(?:\.\d+)?%|\$\d+(?:,\d{3})*(?:\.\d+)?|\b\d+\s*(?:k|m|million|users|clients|requests|ms|s|hours|days|x|percent)\b/i.test(clean);

  // Technical keywords
  const hasTechKeywords = /\b(?:React|Next\.js|TypeScript|JavaScript|Node\.js|Python|Java|Go|Rust|Docker|Kubernetes|AWS|GCP|Azure|GraphQL|REST|SQL|PostgreSQL|MongoDB|Redis|Kafka|CI\/CD|Tailwind|Microservices|ETL)\b/i.test(clean);

  // Score calculation
  let score = 45;
  const feedback: string[] = [];

  if (isStrong) {
    score += 25;
    feedback.push("Begins with a strong, active power verb.");
  } else if (isWeak) {
    score -= 15;
    feedback.push(`Starts with passive phrasing ("${actionVerb}"). Replace with a high-impact action verb.`);
  } else {
    feedback.push("Consider replacing the opening word with an authoritative action verb.");
  }

  if (hasMetrics) {
    score += 20;
    feedback.push("Contains quantifiable metrics demonstrating concrete business or technical impact.");
  } else {
    score -= 10;
    feedback.push("Lacks measurable numbers, metrics, or performance outcomes (Google X-Y-Z formula).");
  }

  if (wordCount >= 14 && wordCount <= 32) {
    score += 10;
    feedback.push("Optimal length (14-32 words) for recruiters and ATS scanners.");
  } else if (wordCount < 10) {
    score -= 10;
    feedback.push("Too brief. Elaborate on the action taken, tools used, and outcome delivered.");
  } else if (wordCount > 38) {
    score -= 5;
    feedback.push("A bit verbose. Trim filler words to keep the bullet punchy and skimmable.");
  }

  if (hasTechKeywords) {
    score += 10;
  }

  const overallScore = Math.max(20, Math.min(score, 98));

  return {
    wordCount,
    hasMetrics,
    hasStrongVerb: isStrong,
    isWeakVerb: isWeak,
    actionVerb,
    overallScore,
    feedback,
  };
}

function stripOpeningVerbs(bullet: string): string {
  let clean = bullet.trim().replace(/^[-*•]\s*/, "");
  for (const pattern of WEAK_VERB_PATTERNS) {
    clean = clean.replace(pattern, "").trim();
  }
  clean = clean.replace(/^(?:designed|developed|built|created|wrote|managed|ran)\s+/i, "");
  return clean.replace(/^and\s+/i, "").trim();
}

function fallbackMultiImprovement(
  originalBullet: string,
  action: ImprovementAction,
  contextJobDescription?: string
): MultiVariationOutput {
  const analysis = analyzeBullet(originalBullet);
  const coreContent = stripOpeningVerbs(originalBullet) || "production systems and database optimizations";

  const cleanRole = contextJobDescription
    ? contextJobDescription.split(/\n/)[0].replace(/role:|job:/i, "").trim().slice(0, 50)
    : "modern web services";

  const variations: BulletVariation[] = [
    {
      id: "var-1-xyz",
      style: "metric_driven",
      styleLabel: "Google X-Y-Z Impact Formula",
      improved: `Spearheaded end-to-end delivery of ${coreContent}, accelerating system performance by 35% and saving 15+ engineering hours weekly.`,
      explanation: "Applied Google's proven 'Accomplished [X] as measured by [Y] by doing [Z]' formula with quantified latency and productivity gains.",
      score: 95,
    },
    {
      id: "var-2-tech",
      style: "technical_depth",
      styleLabel: "Architectural & Technical Depth",
      improved: `Architected and implemented distributed ${coreContent} utilizing modern async pipelines and Redis caching, achieving 99.9% uptime across production.`,
      explanation: "Emphasized architectural patterns, distributed systems resilience, and enterprise-grade reliability.",
      score: 92,
    },
    {
      id: "var-3-concise",
      style: "concise",
      styleLabel: "Concise & High-Impact",
      improved: `Engineered scalable ${coreContent}, reducing query latency by 40% and enhancing overall user experience.`,
      explanation: "Eliminated filler words while preserving authoritative action verbs and measurable performance outcomes.",
      score: 90,
    },
  ];

  if (action === "TAILOR_TO_JOB" && contextJobDescription) {
    variations[0] = {
      id: "var-tailored-job",
      style: "ats_optimized",
      styleLabel: "Target Role & ATS Alignment",
      improved: `Engineered production-grade ${coreContent} aligned with ${cleanRole} standards, leveraging TypeScript, CI/CD automation, and modern cloud design principles.`,
      explanation: "Injected target role terminology and ATS keywords to maximize relevancy for recruiter screens.",
      score: 96,
    };
  } else if (action === "LEADERSHIP") {
    variations[0] = {
      id: "var-leadership",
      style: "leadership",
      styleLabel: "Leadership & Cross-Functional Ownership",
      improved: `Championed the design and rollout of ${coreContent}, mentoring 4 engineers and aligning product roadmaps with executive stakeholders.`,
      explanation: "Highlighted mentorship, initiative, stakeholder management, and cross-functional leadership.",
      score: 94,
    };
  }

  return {
    original: originalBullet,
    originalAnalysis: analysis,
    variations,
  };
}

export async function improveResumeBulletMulti(
  originalBullet: string,
  action: ImprovementAction,
  contextJobDescription?: string
): Promise<MultiVariationOutput> {
  const analysis = analyzeBullet(originalBullet);

  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    const prompt = `
      You are an elite executive resume consultant and technical hiring manager.
      
      Original Bullet: "${originalBullet}"
      Primary Enhancement Goal: ${action}
      Target Job / Context: "${contextJobDescription || "Senior Software Engineer"}"
      
      Generate 3 distinct, top-tier improvements for this bullet point:
      1. Variation 1: Metric-Driven (following Google's X-Y-Z formula: Accomplished [X] as measured by [Y] by doing [Z], with realistic quantified numbers like %, ms, $, hours).
      2. Variation 2: Technical Depth & Architecture (highlighting scale, modern tech stack, distributed systems, or protocols).
      3. Variation 3: Concise & Punchy (under 22 words, zero fluff, powerful action verb).
      
      For each variation, provide:
      - style: one of "metric_driven", "technical_depth", "concise", "leadership", "ats_optimized"
      - styleLabel: human friendly title
      - improved: the exact rewritten bullet point
      - explanation: 1 concise sentence explaining the strategic improvement
      - score: integer from 88 to 98
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are a resume improvement engine. Respond in valid JSON matching this schema:
            {
              "variations": [
                {
                  "id": "var-1",
                  "style": "metric_driven",
                  "styleLabel": "Google X-Y-Z Impact Formula",
                  "improved": "Spearheaded...",
                  "explanation": "Applied Google XYZ...",
                  "score": 95
                }
              ]
            }`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.variations && Array.isArray(parsed.variations) && parsed.variations.length > 0) {
          return {
            original: originalBullet,
            originalAnalysis: analysis,
            variations: parsed.variations.map((v: any, idx: number) => ({
              id: v.id || `var-${idx + 1}`,
              style: v.style || "metric_driven",
              styleLabel: v.styleLabel || "Enhanced Variation",
              improved: v.improved,
              explanation: v.explanation || "Enhanced clarity and measurable outcomes.",
              score: v.score || 92,
            })),
          };
        }
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to heuristic bullet improver:", error);
    }
  }

  return fallbackMultiImprovement(originalBullet, action, contextJobDescription);
}

/**
 * Backwards-compatible single-bullet improvement function
 */
export async function improveResumeBullet(
  originalBullet: string, 
  action: ImprovementAction,
  contextJobDescription?: string
): Promise<ResumeImprovementOutput> {
  const multi = await improveResumeBulletMulti(originalBullet, action, contextJobDescription);
  const best = multi.variations[0];

  return {
    original: originalBullet,
    improved: best ? best.improved : originalBullet,
    explanation: best ? best.explanation : "Enhanced impact and action phrasing",
  };
}
