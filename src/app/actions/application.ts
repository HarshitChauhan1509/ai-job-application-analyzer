"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createApplicationAction(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existing = await prisma.application.findFirst({
      where: { userId: user.id, jobId },
    });

    if (existing) {
      return { success: false, error: "Application already tracking this job" };
    }

    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        resumeId: primaryResume?.id || null,
        status: "SAVED",
      },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: "CREATED",
        description: "Application tracking started",
      },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    revalidatePath("/jobs");

    return { success: true, application };
  } catch (error) {
    console.error("Error creating application:", error);
    return { success: false, error: "Failed to create application" };
  }
}

export async function updateApplicationStatusAction(applicationId: string, newStatus: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Application not found" };
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    const event = await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "STATUS_CHANGE",
        description: `Status updated from ${existing.status} to ${newStatus}`,
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath("/dashboard");

    return { success: true, application, event };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function addApplicationNoteAction(applicationId: string, note: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!note || !note.trim()) {
      return { success: false, error: "Note cannot be empty" };
    }

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Application not found" };
    }

    const event = await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "NOTE_ADDED",
        description: note.trim(),
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/applications/${applicationId}`);
    return { success: true, event };
  } catch (error) {
    console.error("Error adding application note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function updateApplicationDetailsAction(
  applicationId: string,
  data: { notes?: string | null; resumeId?: string | null }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Application not found" };
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.resumeId !== undefined ? { resumeId: data.resumeId || null } : {}),
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath("/dashboard");

    return { success: true, application: updated };
  } catch (error) {
    console.error("Error updating application details:", error);
    return { success: false, error: "Failed to save application changes" };
  }
}

export async function deleteApplicationAction(applicationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Application not found" };
    }

    await prisma.application.delete({
      where: { id: applicationId },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");
    revalidatePath("/jobs");

    return { success: true };
  } catch (error) {
    console.error("Error deleting application:", error);
    return { success: false, error: "Failed to delete application" };
  }
}

export async function quickCreateApplicationAction(data: {
  company: string;
  position: string;
  location?: string;
  status?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { company, position, location, status = "SAVED", notes } = data;
  if (!company.trim() || !position.trim()) {
    return { success: false, error: "Company and position are required" };
  }

  try {
    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    // 1. Create job
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        company: company.trim(),
        position: position.trim(),
        location: location?.trim() || null,
        description: `Tracked application for ${position} at ${company}`,
      },
    });

    // 2. Create Application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: job.id,
        resumeId: primaryResume?.id || null,
        status: status || "SAVED",
        notes: notes?.trim() || null,
      },
    });

    // 3. Log initial tracking event
    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: "CREATED",
        description: `Application created with status: ${status || "SAVED"}`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/jobs");

    return { success: true, application };
  } catch (error: unknown) {
    console.error("Error in quickCreateApplicationAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create application",
    };
  }
}
