"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface AnalyticsData {
  funnel: {
    totalApplications: number;
    saved: number;
    applied: number;
    screening: number;
    interview: number;
    offer: number;
    rejected: number;
    activeApplications: number;
    savedToAppliedRate: number;
    appliedToInterviewRate: number;
    interviewToOfferRate: number;
    overallSuccessRate: number;
  };
  velocity: {
    avgDaysToInterview: number | null;
    avgDaysToOffer: number | null;
    fastestResponseDays: number | null;
    totalEventsLogged: number;
  };
  atsCorrelation: {
    totalScoredJobs: number;
    avgScoreInterview: number | null;
    avgScoreRejected: number | null;
    avgScoreOverall: number | null;
    tierDistribution: {
      highFit: { count: number; interviewCount: number }; // >= 80%
      moderateFit: { count: number; interviewCount: number }; // 65-79%
      stretchFit: { count: number; interviewCount: number }; // < 65%
    };
  };
  interviewCoach: {
    totalSessions: number;
    completedSessions: number;
    avgScore: number | null;
    bestScore: number | null;
    clearedBarRate: number;
  };
  outreach: {
    totalDirectPitchesSent: number;
    outreachByPitchType: {
      founder: number;
      recruiter: number;
    };
    hasConnectedMailbox: boolean;
    connectedEmailAddress: string | null;
  };
  credits: {
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
    spendByAction: Record<string, number>;
  };
}

export async function getAnalyticsDataAction(): Promise<{
  success: boolean;
  data?: AnalyticsData;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch user applications with jobs and events
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: {
        job: true,
        events: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const statusCounts: Record<string, number> = {
      SAVED: 0,
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
    };

    applications.forEach((app) => {
      if (app.status in statusCounts) {
        statusCounts[app.status] += 1;
      }
    });

    const totalApplications = applications.length;
    const saved = statusCounts.SAVED;
    const applied = statusCounts.APPLIED;
    const screening = statusCounts.SCREENING;
    const interview = statusCounts.INTERVIEW;
    const offer = statusCounts.OFFER;
    const rejected = statusCounts.REJECTED;

    // Applications that have reached at least APPLIED status
    const everAppliedCount = applied + screening + interview + offer + rejected;

    // Applications that have reached interview or screening
    const reachedInterviewOrScreening = screening + interview + offer;

    const savedToAppliedRate =
      totalApplications > 0
        ? Math.round((everAppliedCount / totalApplications) * 100)
        : 0;

    const appliedToInterviewRate =
      everAppliedCount > 0
        ? Math.round((reachedInterviewOrScreening / everAppliedCount) * 100)
        : 0;

    const interviewToOfferRate =
      reachedInterviewOrScreening > 0
        ? Math.round((offer / reachedInterviewOrScreening) * 100)
        : 0;

    const overallSuccessRate =
      everAppliedCount > 0
        ? Math.round((offer / everAppliedCount) * 100)
        : 0;

    const activeApplications = applied + screening + interview;

    // 2. Velocity calculations from ApplicationEvents
    const allEvents = applications.flatMap((app) => app.events);
    const totalEventsLogged = allEvents.length;

    const interviewResponseDays: number[] = [];
    const offerResponseDays: number[] = [];

    applications.forEach((app) => {
      const createdTime = new Date(app.createdAt).getTime();

      // Find first interview event or interview transition
      const interviewEvent = app.events.find(
        (e) =>
          e.description?.toLowerCase().includes("interview") ||
          (e.type === "STATUS_CHANGE" && e.description?.includes("INTERVIEW"))
      );

      if (interviewEvent) {
        const eventTime = new Date(interviewEvent.date).getTime();
        const diffDays = Math.max(
          1,
          Math.round((eventTime - createdTime) / (1000 * 60 * 60 * 24))
        );
        interviewResponseDays.push(diffDays);
      } else if (app.status === "INTERVIEW" || app.status === "OFFER") {
        const updateTime = new Date(app.updatedAt).getTime();
        const diffDays = Math.max(
          1,
          Math.round((updateTime - createdTime) / (1000 * 60 * 60 * 24))
        );
        interviewResponseDays.push(diffDays);
      }

      // Find offer event
      const offerEvent = app.events.find(
        (e) =>
          e.description?.toLowerCase().includes("offer") ||
          (e.type === "STATUS_CHANGE" && e.description?.includes("OFFER"))
      );

      if (offerEvent) {
        const eventTime = new Date(offerEvent.date).getTime();
        const diffDays = Math.max(
          1,
          Math.round((eventTime - createdTime) / (1000 * 60 * 60 * 24))
        );
        offerResponseDays.push(diffDays);
      } else if (app.status === "OFFER") {
        const updateTime = new Date(app.updatedAt).getTime();
        const diffDays = Math.max(
          1,
          Math.round((updateTime - createdTime) / (1000 * 60 * 60 * 24))
        );
        offerResponseDays.push(diffDays);
      }
    });

    const avgDaysToInterview =
      interviewResponseDays.length > 0
        ? Math.round(
            (interviewResponseDays.reduce((a, b) => a + b, 0) /
              interviewResponseDays.length) *
              10
          ) / 10
        : null;

    const avgDaysToOffer =
      offerResponseDays.length > 0
        ? Math.round(
            (offerResponseDays.reduce((a, b) => a + b, 0) /
              offerResponseDays.length) *
              10
          ) / 10
        : null;

    const fastestResponseDays =
      interviewResponseDays.length > 0
        ? Math.min(...interviewResponseDays)
        : null;

    // 3. ATS Match Score correlation
    const jobIds = applications.map((a) => a.jobId);
    const resumeIds = applications
      .map((a) => a.resumeId)
      .filter((id): id is string => Boolean(id));

    const matches = await prisma.jobMatch.findMany({
      where: {
        jobId: { in: jobIds },
        ...(resumeIds.length > 0 ? { resumeId: { in: resumeIds } } : {}),
      },
    });

    // Map match scores to applications
    const matchMap = new Map<string, number>();
    matches.forEach((m) => {
      matchMap.set(`${m.resumeId}_${m.jobId}`, m.overallScore);
      matchMap.set(m.jobId, m.overallScore); // fallback by jobId
    });

    const interviewScores: number[] = [];
    const rejectedScores: number[] = [];
    const allScores: number[] = [];

    const tierDistribution = {
      highFit: { count: 0, interviewCount: 0 },
      moderateFit: { count: 0, interviewCount: 0 },
      stretchFit: { count: 0, interviewCount: 0 },
    };

    applications.forEach((app) => {
      const key = app.resumeId ? `${app.resumeId}_${app.jobId}` : app.jobId;
      const score = matchMap.get(key) ?? matchMap.get(app.jobId);

      if (typeof score === "number") {
        allScores.push(score);

        const isInterviewOrOffer =
          app.status === "INTERVIEW" ||
          app.status === "SCREENING" ||
          app.status === "OFFER";

        if (score >= 80) {
          tierDistribution.highFit.count += 1;
          if (isInterviewOrOffer) tierDistribution.highFit.interviewCount += 1;
        } else if (score >= 65) {
          tierDistribution.moderateFit.count += 1;
          if (isInterviewOrOffer) tierDistribution.moderateFit.interviewCount += 1;
        } else {
          tierDistribution.stretchFit.count += 1;
          if (isInterviewOrOffer) tierDistribution.stretchFit.interviewCount += 1;
        }

        if (isInterviewOrOffer) {
          interviewScores.push(score);
        } else if (app.status === "REJECTED") {
          rejectedScores.push(score);
        }
      }
    });

    const avgScoreOverall =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null;

    const avgScoreInterview =
      interviewScores.length > 0
        ? Math.round(
            interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length
          )
        : null;

    const avgScoreRejected =
      rejectedScores.length > 0
        ? Math.round(
            rejectedScores.reduce((a, b) => a + b, 0) / rejectedScores.length
          )
        : null;

    // 4. Voice Interview Coach statistics
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const completedSessions = interviewSessions.filter(
      (s) => s.completedAt !== null && typeof s.overallScore === "number"
    );

    const scoresList = completedSessions
      .map((s) => s.overallScore)
      .filter((s): s is number => typeof s === "number");

    const avgScore =
      scoresList.length > 0
        ? Math.round(
            (scoresList.reduce((a, b) => a + b, 0) / scoresList.length) * 10
          ) / 10
        : null;

    const bestScore = scoresList.length > 0 ? Math.max(...scoresList) : null;

    const clearedBarCount = scoresList.filter((s) => s >= 7.5).length;
    const clearedBarRate =
      scoresList.length > 0
        ? Math.round((clearedBarCount / scoresList.length) * 100)
        : 0;

    // 5. Outreach & Connected Mailbox statistics
    const outreachEvents = allEvents.filter((e) => e.type === "OUTREACH_SENT");
    let founderCount = 0;
    let recruiterCount = 0;

    outreachEvents.forEach((e) => {
      if (e.description?.toLowerCase().includes("founder")) {
        founderCount += 1;
      } else {
        recruiterCount += 1;
      }
    });

    const emailConnection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
    });

    // 6. User Credit usage summary
    const userCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    const spendByAction: Record<string, number> = {};
    if (userCredit) {
      userCredit.transactions.forEach((tx) => {
        if (tx.amount < 0) {
          const absAmount = Math.abs(tx.amount);
          spendByAction[tx.action] = (spendByAction[tx.action] || 0) + absAmount;
        }
      });
    }

    return {
      success: true,
      data: {
        funnel: {
          totalApplications,
          saved,
          applied,
          screening,
          interview,
          offer,
          rejected,
          activeApplications,
          savedToAppliedRate,
          appliedToInterviewRate,
          interviewToOfferRate,
          overallSuccessRate,
        },
        velocity: {
          avgDaysToInterview,
          avgDaysToOffer,
          fastestResponseDays,
          totalEventsLogged,
        },
        atsCorrelation: {
          totalScoredJobs: allScores.length,
          avgScoreInterview,
          avgScoreRejected,
          avgScoreOverall,
          tierDistribution,
        },
        interviewCoach: {
          totalSessions: interviewSessions.length,
          completedSessions: completedSessions.length,
          avgScore,
          bestScore,
          clearedBarRate,
        },
        outreach: {
          totalDirectPitchesSent: outreachEvents.length,
          outreachByPitchType: {
            founder: founderCount,
            recruiter: recruiterCount,
          },
          hasConnectedMailbox:
            Boolean(emailConnection) &&
            emailConnection?.syncStatus !== "DISCONNECTED",
          connectedEmailAddress: emailConnection?.email || null,
        },
        credits: {
          currentBalance: userCredit?.balance ?? 50,
          totalEarned: userCredit?.totalEarned ?? 50,
          totalSpent: userCredit?.totalSpent ?? 0,
          spendByAction,
        },
      },
    };
  } catch (error) {
    console.error("Error calculating analytics data:", error);
    return {
      success: false,
      error: "Failed to compile application funnel analytics.",
    };
  }
}
