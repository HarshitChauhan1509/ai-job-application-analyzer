"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateCompensation, CompensationInput } from "@/lib/compensation-calculator";
import {
  generateNegotiationStrategy,
  NegotiationStrategyRequest,
  NegotiationStrategyResult,
} from "@/lib/ai/negotiation-generator";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";
import { sendGmailMessage } from "@/lib/email-sync/gmail-sender";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (user) return user;

  // Fallback for development/demo mode if not logged in
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
  return demoUser;
}

export interface SaveJobOfferInput {
  id?: string;
  applicationId?: string;
  company: string;
  role: string;
  location?: string;
  baseSalary: number;
  targetBonus?: number;
  signOnBonus?: number;
  equityType?: "OPTIONS" | "RSU" | "NONE";
  equityShares?: number;
  strikePrice?: number;
  currentValuation?: number;
  vestingYears?: number;
  vestingCliffMonths?: number;
  currency?: string;
  notes?: string;
  deadline?: string | Date | null;
  status?: string;
}

/**
 * Saves or updates a Job Offer, computing Year 1 Total Comp and equity valuation
 */
export async function saveJobOfferAction(input: SaveJobOfferInput) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const compCalc = calculateCompensation({
      baseSalary: input.baseSalary,
      targetBonus: input.targetBonus,
      signOnBonus: input.signOnBonus,
      equityType: input.equityType,
      equityShares: input.equityShares,
      strikePrice: input.strikePrice,
      currentValuation: input.currentValuation,
      vestingYears: input.vestingYears,
      vestingCliffMonths: input.vestingCliffMonths,
    });

    const offerData = {
      userId: user.id,
      applicationId: input.applicationId || null,
      company: input.company.trim(),
      role: input.role.trim(),
      location: input.location?.trim() || null,
      baseSalary: input.baseSalary,
      targetBonus: input.targetBonus || 0,
      signOnBonus: input.signOnBonus || 0,
      equityType: input.equityType || "OPTIONS",
      equityShares: input.equityShares || 0,
      strikePrice: input.strikePrice || 0,
      currentValuation: input.currentValuation || 0,
      equityEstimatedValue: compCalc.fourYearEquityValue,
      vestingYears: input.vestingYears || 4,
      vestingCliffMonths: input.vestingCliffMonths || 12,
      annualTC: compCalc.year1TotalCompensation,
      currency: input.currency || "USD",
      notes: input.notes?.trim() || null,
      status: input.status || "EVALUATING",
      deadline: input.deadline ? new Date(input.deadline) : null,
    };

    let offer;
    if (input.id) {
      offer = await prisma.jobOffer.update({
        where: { id: input.id },
        data: offerData,
      });
    } else {
      offer = await prisma.jobOffer.create({
        data: offerData,
      });
    }

    // If tied to an application, log an event
    if (input.applicationId) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: input.applicationId,
          type: "OFFER_EVALUATED",
          description: `Offer compensation analyzed: $${compCalc.year1TotalCompensation.toLocaleString()} Year 1 TC (${input.company})`,
        },
      });
      revalidatePath(`/applications/${input.applicationId}`);
    }

    revalidatePath("/offers");
    revalidatePath("/analytics");

    return { success: true, offer };
  } catch (error) {
    console.error("Error saving job offer:", error);
    return { success: false, error: "Failed to save job offer" };
  }
}

/**
 * Retrieves all user job offers
 */
export async function getUserOffersAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: true, offers: [] };
    }

    const offers = await prisma.jobOffer.findMany({
      where: { userId: user.id },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, offers };
  } catch (error) {
    console.error("Error fetching job offers:", error);
    return { success: false, error: "Failed to fetch offers", offers: [] };
  }
}

/**
 * Retrieves a single job offer by id
 */
export async function getJobOfferDetailAction(id: string) {
  try {
    const offer = await prisma.jobOffer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!offer) {
      return { success: false, error: "Job offer not found" };
    }

    return { success: true, offer };
  } catch (error) {
    console.error("Error fetching offer detail:", error);
    return { success: false, error: "Failed to load offer" };
  }
}

/**
 * Deletes a job offer
 */
export async function deleteJobOfferAction(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const offer = await prisma.jobOffer.findUnique({ where: { id } });
    if (!offer || offer.userId !== user.id) {
      return { success: false, error: "Offer not found or unauthorized" };
    }

    await prisma.jobOffer.delete({ where: { id } });

    revalidatePath("/offers");
    if (offer.applicationId) {
      revalidatePath(`/applications/${offer.applicationId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting job offer:", error);
    return { success: false, error: "Failed to delete offer" };
  }
}

/**
 * Generates and saves AI counter-offer pitch strategies for an offer
 */
export async function generateOfferNegotiationAction(offerId: string, options: {
  candidatePriorities?: "BASE_SALARY" | "EQUITY_UPSIDE" | "SIGN_ON_BONUS" | "BALANCED";
  competingOffers?: string;
  targetComp?: number;
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.userId !== user.id) {
      return { success: false, error: "Offer not found or unauthorized" };
    }

    // Credit verification (2 credits for AI counter-offer strategy)
    const creditCost = 2;
    const creditCheck = await hasEnoughCredits(user.id, creditCost);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        insufficientCredits: true,
        error: `Insufficient AI credits (${creditCheck.currentBalance} left). Generating counter-offer strategies requires ${creditCost} credits.`,
      };
    }

    const userProfile = await prisma.profile.findUnique({ where: { userId: user.id } });
    const candidateName = user.name || "Candidate";

    const strategyResult = await generateNegotiationStrategy({
      company: offer.company,
      role: offer.role,
      baseSalary: offer.baseSalary,
      targetBonus: offer.targetBonus,
      signOnBonus: offer.signOnBonus,
      equityType: offer.equityType,
      equityShares: offer.equityShares,
      annualTC: offer.annualTC,
      candidateName,
      candidatePriorities: options.candidatePriorities,
      competingOffers: options.competingOffers,
      targetComp: options.targetComp,
    });

    // Save generated strategies into offer
    await prisma.jobOffer.update({
      where: { id: offerId },
      data: {
        negotiationStrategy: JSON.stringify(strategyResult),
      },
    });

    // Deduct credits
    await deductCredits({
      userId: user.id,
      amount: creditCost,
      action: "OUTREACH_PITCH",
      description: `AI Counter-Offer Negotiation Strategy: ${offer.company} (${offer.role})`,
    });

    revalidatePath("/offers");
    if (offer.applicationId) {
      revalidatePath(`/applications/${offer.applicationId}`);
    }

    return { success: true, strategy: strategyResult };
  } catch (error) {
    console.error("Error generating offer negotiation strategy:", error);
    return { success: false, error: "Failed to generate negotiation strategy" };
  }
}

/**
 * Dispatches counter-offer email directly via connected Gmail
 */
export async function sendCounterOfferEmailAction(params: {
  offerId: string;
  recipientEmail: string;
  subject: string;
  emailBody: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { offerId, recipientEmail, subject, emailBody } = params;

    const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.userId !== user.id) {
      return { success: false, error: "Offer not found or unauthorized" };
    }

    const connection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || connection.syncStatus === "ERROR" || !connection.accessToken) {
      return {
        success: false,
        error: "No active Gmail connection found. Connect your mailbox in Applications or use default email client.",
      };
    }

    const sendRes = await sendGmailMessage({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      fromEmail: connection.email,
      to: recipientEmail.trim(),
      subject: subject.trim(),
      body: emailBody.trim(),
      candidateName: user.name || undefined,
    });

    if (!sendRes.success) {
      return {
        success: false,
        error: sendRes.error || "Failed to deliver email through Gmail API.",
      };
    }

    // Update offer status to COUNTERED
    await prisma.jobOffer.update({
      where: { id: offerId },
      data: { status: "COUNTERED" },
    });

    if (offer.applicationId) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: offer.applicationId,
          type: "OUTREACH_SENT",
          description: `Counter-offer email dispatched to ${recipientEmail} (${subject})`,
        },
      });
      revalidatePath(`/applications/${offer.applicationId}`);
    }

    revalidatePath("/offers");

    return {
      success: true,
      messageId: sendRes.messageId,
      isSimulated: sendRes.isSimulated,
    };
  } catch (error) {
    console.error("Error sending counter-offer email:", error);
    return { success: false, error: "Failed to dispatch counter-offer email" };
  }
}
