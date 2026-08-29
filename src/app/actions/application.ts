"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatusAction(applicationId: string, newStatus: string) {
  try {
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    // Create an event for the timeline
    await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "STATUS_CHANGE",
        description: `Status updated to ${newStatus}`,
      },
    });

    revalidatePath("/dashboard/applications");
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
