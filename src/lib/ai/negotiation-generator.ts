import { openai } from "./client";

export interface NegotiationStrategyRequest {
  company: string;
  role: string;
  baseSalary: number;
  targetBonus?: number;
  signOnBonus?: number;
  equityType?: string;
  equityShares?: number;
  annualTC: number;
  candidateName?: string;
  candidatePriorities?: "BASE_SALARY" | "EQUITY_UPSIDE" | "SIGN_ON_BONUS" | "BALANCED";
  competingOffers?: string;
  targetComp?: number;
}

export interface NegotiationPitch {
  id: string;
  title: string;
  tagline: string;
  subject: string;
  emailBody: string;
  expectedOutcome: string;
  bestUsedWhen: string;
}

export interface NegotiationStrategyResult {
  strategies: NegotiationPitch[];
  verbalTalkingPoints: string[];
  pitfallsToAvoid: string[];
  marketContext: string;
}

/**
 * Generates tailored counter-offer strategies and verbal talking points using GPT-4o-mini or high-signal fallback
 */
export async function generateNegotiationStrategy(
  params: NegotiationStrategyRequest
): Promise<NegotiationStrategyResult> {
  const {
    company,
    role,
    baseSalary,
    targetBonus = 0,
    signOnBonus = 0,
    equityType = "OPTIONS",
    equityShares = 0,
    annualTC,
    candidateName = "Candidate",
    competingOffers,
    targetComp,
  } = params;

  // Attempt OpenAI generation
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "mock-key") {
    try {
      const prompt = `You are a world-class executive compensation negotiator advising a senior software engineer / tech professional on negotiating their job offer.

OFFER PARAMETERS:
- Company: ${company}
- Role: ${role}
- Base Salary: $${baseSalary.toLocaleString()}
- Annual Target Bonus: $${targetBonus.toLocaleString()}
- First-Year Sign-on Bonus: $${signOnBonus.toLocaleString()}
- Equity: ${equityShares > 0 ? `${equityShares.toLocaleString()} ${equityType}` : "None specified"}
- Year 1 Total Comp (TC): $${annualTC.toLocaleString()}
${competingOffers ? `- Competing Offer / Market Leverage: ${competingOffers}` : ""}
${targetComp ? `- Target Compensation: $${targetComp.toLocaleString()}` : ""}
- Candidate Name: ${candidateName}

Generate a structured JSON response containing:
1. strategies: Array of exactly 3 distinct negotiation strategies:
   - Strategy 1: "Base Salary Maximizer" (tactful, data-driven, asks for 8-15% higher base grounded in market benchmarks).
   - Strategy 2: "High-Conviction Equity Optimizer" (shows deep startup conviction, asks for 20-30% more equity/options in exchange for accepting current base).
   - Strategy 3: "Sign-on & Runway Bridge" (protects company burn rate by asking for a one-time signing bonus or remote equipment stipend).
   Each strategy must include: id, title, tagline, subject, emailBody (polite, concise, under 180 words), expectedOutcome, bestUsedWhen.
2. verbalTalkingPoints: Exactly 4 bullet points candidate should say on the phone with the recruiter or founder.
3. pitfallsToAvoid: Exactly 3 red flags (e.g. artificial ultimatums, vague requests).
4. marketContext: 2-sentence market calibration for this role.

Respond strictly in valid JSON matching this structure without markdown fences.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.strategies && Array.isArray(parsed.strategies)) {
          return {
            strategies: parsed.strategies,
            verbalTalkingPoints: parsed.verbalTalkingPoints || getFallbackTalkingPoints(company),
            pitfallsToAvoid: parsed.pitfallsToAvoid || getFallbackPitfalls(),
            marketContext: parsed.marketContext || `Market benchmarks for ${role} in tech indicate competitive packages range between $${(baseSalary * 1.08).toFixed(0)} and $${(baseSalary * 1.2).toFixed(0)}.`,
          };
        }
      }
    } catch (err) {
      console.warn("OpenAI negotiation generation failed, using intelligent heuristic fallback:", err);
    }
  }

  // Fallback heuristic generator
  return getHeuristicNegotiationStrategy(params);
}

function getFallbackTalkingPoints(company: string): string[] {
  return [
    `"I am genuinely thrilled about the team's mission at ${company} and the impact I can drive in this role."`,
    `"Based on current market data and my specialized experience, I'd feel completely confident signing immediately if we can bridge the gap on base/equity."`,
    `"If adjusting base salary creates internal parity constraints, would you have flexibility on equity grant size or a sign-on bonus?"`,
    `"I want to make this an easy 'yes' for both sides—can we explore what options exist to close this gap?"`,
  ];
}

function getFallbackPitfalls(): string[] {
  return [
    "Issuing rigid 'take-it-or-leave-it' ultimatums that damage team rapport before you start.",
    "Making vague demands like 'Can you do better?' without anchoring to a specific number or rationale.",
    "Negotiating piece-by-piece rather than presenting all requests holistically in one conversation.",
  ];
}

function getHeuristicNegotiationStrategy(params: NegotiationStrategyRequest): NegotiationStrategyResult {
  const {
    company,
    role,
    baseSalary,
    targetComp,
    annualTC,
    candidateName = "Candidate",
  } = params;

  const targetBase = targetComp ? targetComp : Math.round(baseSalary * 1.12);
  const targetEquityPercent = 25;
  const signOnTarget = Math.round(baseSalary * 0.1);

  const strategies: NegotiationPitch[] = [
    {
      id: "base-maximizer",
      title: "Base Salary Maximizer",
      tagline: "Market-grounded request for higher guaranteed cash compensation",
      subject: `Excited about ${company} & Quick Compensation Question — ${candidateName}`,
      emailBody: `Hi team,

Thank you so much for extending the offer to join ${company} as ${role}! I really enjoyed meeting the team and am genuinely excited about the problems you are tackling.

After reviewing the details and evaluating market data for similar senior roles, I would feel completely confident signing the agreement immediately if we could bring the base salary to $${targetBase.toLocaleString()}.

I want to reiterate how enthusiastic I am about the opportunity to contribute to ${company}'s goals. Please let me know if there is room for flexibility on this point.

Best regards,
${candidateName}`,
      expectedOutcome: "Typically results in a 5%–10% base salary increase or an offer meeting halfway.",
      bestUsedWhen: "Use when you have market data, mortgage/living cost constraints, or competing cash offers.",
    },
    {
      id: "equity-optimizer",
      title: "High-Conviction Equity Optimizer",
      tagline: "Trade cash for higher startup equity ownership and long-term upside",
      subject: `Offer Discussion: Team Fit & Equity Alignment — ${candidateName}`,
      emailBody: `Hi team,

I'm thrilled to receive the offer for the ${role} position at ${company}. The team culture and technical roadmap are an incredible match.

Given my strong belief in ${company}'s long-term trajectory, I am eager to maximize my ownership and alignment with the company's upside. Would there be flexibility to increase the initial equity grant by ${targetEquityPercent}%, keeping the base salary at $${baseSalary.toLocaleString()}?

I am ready to commit and make an immediate impact on the product. Looking forward to your thoughts!

Warmly,
${candidateName}`,
      expectedOutcome: "Founders love this request; acceptance rate is high because it protects company cash runway.",
      bestUsedWhen: "Use for high-growth startups (Seed through Series B) where you have deep conviction in enterprise valuation expansion.",
    },
    {
      id: "signon-bridge",
      title: "Runway-Preserving Sign-on Bridge",
      tagline: "Bridge the total compensation gap with a one-time signing bonus",
      subject: `Following up on ${role} Offer — ${candidateName}`,
      emailBody: `Hi team,

Thank you again for the offer to join ${company}. I am very impressed by the team and the opportunity ahead.

I understand that base salary bands and equity pools have strict governance. To bridge the gap with other opportunities I am currently evaluating while respecting internal pay parity, could we consider a one-time sign-on bonus of $${signOnTarget.toLocaleString()}?

With this adjustment, I would be delighted to accept the offer and confirm my start date right away.

Best regards,
${candidateName}`,
      expectedOutcome: "Very easy for hiring managers and finance leaders to approve from discretionary recruitment budgets.",
      bestUsedWhen: "Use when the company cites rigid internal pay parity or HR band ceilings on base salaries.",
    },
  ];

  return {
    strategies,
    verbalTalkingPoints: getFallbackTalkingPoints(company),
    pitfallsToAvoid: getFallbackPitfalls(),
    marketContext: `For ${role} roles at companies comparable to ${company}, top-quartile candidate packages commonly target between $${(baseSalary * 1.08).toFixed(0)} and $${(baseSalary * 1.25).toFixed(0)} in Year 1 total compensation.`,
  };
}
