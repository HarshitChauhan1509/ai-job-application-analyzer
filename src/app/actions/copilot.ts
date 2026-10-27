"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/ai/client";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendCopilotMessageAction(params: {
  message: string;
  history?: CopilotMessage[];
}): Promise<{
  success: boolean;
  reply?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const userQuery = params.message?.trim();
  if (!userQuery) {
    return { success: false, error: "Message cannot be empty." };
  }

  try {
    // 1. Gather rich candidate context
    const [profile, primaryResume, applications] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
      }),
      prisma.resume.findFirst({
        where: { userId: user.id, isPrimary: true },
        include: { analysis: true },
      }),
      prisma.application.findMany({
        where: { userId: user.id },
        include: { job: { select: { company: true, position: true } } },
        take: 10,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const candidateName = user.name || "Candidate";
    const targetRole = primaryResume?.targetRole || profile?.headline || "Software Engineer";
    
    let skillsList: string[] = [];
    if (primaryResume?.tags) {
      try {
        const parsed = JSON.parse(primaryResume.tags);
        if (Array.isArray(parsed)) skillsList = parsed;
      } catch {}
    }

    const trackedCompanies = applications
      .map((a) => `${a.job?.company} (${a.job?.position} - ${a.status})`)
      .join(", ");

    const systemPrompt = `You are CareerPilot Copilot, an elite AI Career Strategist, Technical Interview Coach, and Startup Job Search Copilot (inspired by Aarivi and Linear).

CANDIDATE CONTEXT:
- Name: ${candidateName}
- Target Role: ${targetRole}
- Headline: ${profile?.headline || "Builder & Engineer"}
- Core Skills: ${skillsList.slice(0, 8).join(", ") || "TypeScript, React, Node.js, Next.js, Cloud Architectures"}
- Active Pipeline: ${applications.length} applications tracked. Recent: ${trackedCompanies || "None yet"}

YOUR CAPABILITIES:
1. Provide punchy, tactical, high-converting career guidance for startup roles (YC companies, high-growth tech teams, remote startups).
2. Brainstorm tough technical interview answers (system design, architecture, behavioral frameworks like STAR).
3. Draft sharp cold outreach pitches or follow-up emails to founders/CTOs.
4. Advise on salary and equity negotiation (base vs RSUs vs options, dilution, liquidation preference).
5. Compare job opportunities and evaluate tech stack trade-offs.

GUIDELINES:
- Be concise, direct, and actionable (avoid fluff, buzzwords, or robotic preamble).
- Format output with clean Markdown (bullet points, bold text, short paragraphs).
- Reference the candidate's actual skills and target companies when relevant.`;

    const hasValidKey =
      process.env.OPENAI_API_KEY &&
      !process.env.OPENAI_API_KEY.startsWith("dummy") &&
      process.env.OPENAI_API_KEY !== "your-openai-api-key";

    if (hasValidKey) {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...(params.history || []).slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: userQuery },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 650,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) {
        return { success: true, reply };
      }
    }

    // Heuristic fallback response
    const fallbackReply = generateHeuristicCopilotReply(userQuery, {
      candidateName,
      targetRole,
      skills: skillsList,
      pipelineCount: applications.length,
      trackedCompanies,
    });

    return { success: true, reply: fallbackReply };
  } catch (error: any) {
    console.error("Error in sendCopilotMessageAction:", error);
    return {
      success: false,
      error: error.message || "Failed to process Copilot request",
    };
  }
}

/**
 * Intelligent heuristic advisor when AI key is unavailable or during rate limits
 */
function generateHeuristicCopilotReply(
  query: string,
  ctx: {
    candidateName: string;
    targetRole: string;
    skills: string[];
    pipelineCount: number;
    trackedCompanies: string;
  }
): string {
  const q = query.toLowerCase();

  if (q.includes("negotiat") || q.includes("salary") || q.includes("offer") || q.includes("equity")) {
    return `### Strategy for Startup Offer Negotiation 💼

When negotiating offers for **${ctx.targetRole}** roles:

1. **Never Give the First Number:** If asked for current compensation, anchor on market value: *"Based on current Bay Area / Remote benchmarks for ${ctx.targetRole}, I'm targeting a competitive package between \$160k–\$195k base plus equity."*
2. **Value Startup Equity with Skepticism:**
   - Ask for: *Total Outstanding Shares*, *Last Preferred Valuation*, and *Vesting Schedule* (standard is 4-year with 1-year cliff).
   - If early-stage (Seed / Series A), prioritize meaningful equity (0.25%–0.75%).
   - If late-stage (Series B+), push for cash stability or performance bonuses.
3. **The Multi-Offer Leverage Play:** Even having interviews scheduled at other companies increases leverage: *"I'm currently in final rounds with another high-growth startup, but your team's mission is my top choice if we can bridge the gap on base."*`;
  }

  if (q.includes("follow up") || q.includes("no reply") || q.includes("ghost")) {
    return `### High-Reply Follow-Up Template ⏱️

Send this **3 to 4 business days** after your initial pitch:

> **Subject:** Re: ${ctx.targetRole} @ [Company] — quick update
> 
> Hi [Name],
> 
> I wanted to quickly follow up on my note from earlier this week. I know you're heads-down scaling the product.
> 
> I recently published an update to my proof-of-work project demonstrating high-throughput data sync matching your team's tech stack.
> 
> Would 10 minutes this Thursday or Friday work to connect briefly?
> 
> Best,  
> ${ctx.candidateName}

**Tip:** Adding a small piece of new value (e.g. a recent commit or architecture thought) yields a **35% higher response rate** than a generic *"just checking in"* message.`;
  }

  if (q.includes("interview") || q.includes("question") || q.includes("prep")) {
    return `### Targeted Interview Prep for ${ctx.targetRole} 🎯

Based on your skills (${ctx.skills.slice(0, 4).join(", ") || "full-stack architectures"}):

1. **System Design Challenge:**
   - *Question:* "How would you design a real-time collaborative workspace with offline sync and conflict resolution?"
   - *Key topics to cite:* WebSockets, CRDTs, optimistic UI updates, Redis pub/sub, database indexing.
2. **Behavioral Alignment (Startup Culture):**
   - Startup founders test for **high agency**: Be ready with a story of shipping an ambitious feature with minimal supervision and tight deadlines.
3. **Questions to Ask the Founders:**
   - *"What is the biggest technical bottleneck currently slowing your sprint velocity?"*
   - *"What does success look like for this role in the first 90 days?"*`;
  }

  return `### CareerPilot Copilot Insights 💡

Hi **${ctx.candidateName}**! Here are actionable recommendations for your **${ctx.targetRole}** search:

- **Pipeline Velocity:** You currently have **${ctx.pipelineCount}** active applications tracked in your pipeline. Aim to keep 8–12 active opportunities across various stages.
- **Proof-of-Work Showcase:** Founders prioritize verifiable code. Ensure your top 3 GitHub repositories are pinned in your profile so they appear on your public portfolio and cold pitches.
- **Direct Outreach:** Skip generic job boards when possible. Use the **Curated Startup Explorer** (\`/jobs/explore\`) to find hot roles and draft personalized founder pitches in 1 click.

What would you like to dive into next?
- *"Draft a follow-up email for a recruiter"*
- *"Mock technical interview questions"*
- *"How to negotiate equity vs salary"*`;
}
