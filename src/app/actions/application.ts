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
      where: { userId: user.id, jobId }
    });

    if (existing) {
      return { success: false, error: "Application already tracking this job" };
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        status: "SAVED"
      }
    });

    // Create an initial event
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
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "STATUS_CHANGE",
        description: `Status updated to ${newStatus}`,
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/dashboard/applications/${applicationId}`);
    
    return { success: true, application };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function addApplicationNoteAction(applicationId: string, note: string) {
  try {
    await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "NOTE_ADDED",
        description: note,
      },
    });

    revalidatePath(`/dashboard/applications/${applicationId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding application note:", error);
    return { success: false, error: "Failed to add note" };
  }
}
