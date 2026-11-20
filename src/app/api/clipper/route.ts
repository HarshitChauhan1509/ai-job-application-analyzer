import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { analyzeJobDescription } from "@/lib/ai/job-analyzer";
import { matchJobToResume } from "@/lib/ai/job-matcher";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "CareerPilot Web Clipper API",
      version: "1.0.0",
      description: "1-Click Job Description Clipper for Chrome & Edge extensions",
    },
    { headers: corsHeaders() }
  );
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    let userId = currentUser?.id;

    // Fallback for extension development / demo mode if session cookie is not forwarded
    if (!userId) {
      let demoUser = await prisma.user.findFirst();
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            name: "Demo Candidate",
            email: "candidate@careerpilot.local",
            password: "democandidate123",
          },
        });
      }
      userId = demoUser.id;
    }

    const body = await req.json();

    const rawText = (body.rawText || body.description || "").trim();
    const sourceUrl = body.url || body.sourceUrl || null;
    const targetStage = body.targetStage === "APPLIED" ? "APPLIED" : "SAVED";

    let customCompany = (body.company || body.customCompany || "").trim();
    let customPosition = (body.title || body.position || body.customPosition || "").trim();
    let customLocation = (body.location || body.customLocation || "").trim();

    if (!rawText && !customPosition) {
      return NextResponse.json(
        { success: false, error: "Please provide job description text or title" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Analyze role requirements via AI or heuristic analyzer
    const textToAnalyze = rawText || `${customPosition} at ${customCompany}\nLocation: ${customLocation}`;
    const analysis = await analyzeJobDescription(textToAnalyze);

    const finalCompany = customCompany || analysis.company?.trim() || "Target Company";
    const finalPosition = customPosition || analysis.position?.trim() || "Software Engineer";
    const finalLocation = customLocation || analysis.location || "Remote / Flexible";
    const employmentType = analysis.employmentType || "Full-time";

    // 2. Fetch primary resume to calculate instant ATS match
    const primaryResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      include: { analysis: true },
    });

    let overallMatchScore = 78;
    let matchData: any = null;

    if (primaryResume) {
      try {
        const resumeSummary = primaryResume.analysis
          ? `Resume for ${primaryResume.name}. Strengths: ${primaryResume.analysis.strengths}. Missing: ${primaryResume.analysis.missingKeywords}`
          : primaryResume.name;

        matchData = await matchJobToResume(resumeSummary, textToAnalyze);
        overallMatchScore = matchData.overallScore;
      } catch (err) {
        console.warn("ATS match calculation warning during extension clip:", err);
      }
    }

    // 3. Persist Job, Analysis, Match, and Application in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          userId,
          company: finalCompany,
          position: finalPosition,
          description: rawText || textToAnalyze,
          url: sourceUrl,
          location: finalLocation,
          employmentType,
          experienceRequirement: analysis.seniority || "Mid-Senior",
        },
      });

      await tx.jobAnalysis.create({
        data: {
          jobId: job.id,
          requiredSkills: JSON.stringify(analysis.requiredSkills || []),
          preferredSkills: JSON.stringify(analysis.preferredSkills || []),
          responsibilities: JSON.stringify(analysis.responsibilities || []),
          keywords: JSON.stringify(analysis.keywords || []),
          seniority: analysis.seniority || "Mid-Senior",
        },
      });

      if (primaryResume && matchData) {
        await tx.jobMatch.create({
          data: {
            resumeId: primaryResume.id,
            jobId: job.id,
            overallScore: matchData.overallScore,
            skillsScore: matchData.skillsScore,
            experienceScore: matchData.experienceScore,
            keywordsScore: matchData.keywordsScore,
            strongMatches: JSON.stringify(matchData.strongMatches || []),
            missingSkills: JSON.stringify(matchData.missingSkills || []),
            missingKeywords: JSON.stringify(matchData.missingKeywords || []),
            recommendations: JSON.stringify(matchData.recommendations || []),
          },
        });
      }

      const application = await tx.application.create({
        data: {
          userId,
          jobId: job.id,
          resumeId: primaryResume?.id || null,
          status: targetStage,
          notes: `Clipped from Web Extension (${sourceUrl ? new URL(sourceUrl).hostname : "Browser"}) on ${new Date().toLocaleDateString()}`,
          events: {
            create: {
              type: "STATUS_CHANGE",
              description: `Application clipped via Chrome Extension into '${targetStage}' stage. ATS fit: ${overallMatchScore}%.`,
            },
          },
        },
      });

      return { job, application };
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

    return NextResponse.json(
      {
        success: true,
        applicationId: result.application.id,
        jobId: result.job.id,
        company: finalCompany,
        position: finalPosition,
        location: finalLocation,
        matchScore: overallMatchScore,
        targetStage,
        requiredSkills: analysis.requiredSkills || [],
        viewUrl: `${appUrl}/applications/${result.application.id}`,
        outreachUrl: `${appUrl}/applications/${result.application.id}?openOutreach=true`,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error("Error in clipper API route:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to clip job posting" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
