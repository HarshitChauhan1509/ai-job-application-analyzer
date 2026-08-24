"use server";

import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

/**
 * Stores a resume record in the database after the file is uploaded.
 * In a real implementation, we'd take FormData, upload to Supabase here,
 * then store the record.
 */
export async function createResumeAction(
  userId: string, 
  fileBuffer: Buffer, 
  fileName: string, 
  contentType: string
) {
  try {
    // 1. Upload to storage
    const path = `${userId}/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
    const { url } = await storage.uploadFile(path, fileBuffer, contentType);

    // 2. Save to database
    const resume = await prisma.resume.create({
      data: {
        userId,
        name: fileName,
        fileUrl: url,
        // Mark as primary if it's their first resume
        isPrimary: (await prisma.resume.count({ where: { userId } })) === 0,
      },
    });

    revalidatePath("/dashboard/resumes");
    return { success: true, resume };
  } catch (error) {
    console.error("Failed to create resume:", error);
    return { success: false, error: "Failed to upload and create resume" };
  }
}

export async function deleteResumeAction(resumeId: string, userId: string) {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.userId !== userId) {
      throw new Error("Unauthorized or not found");
    }

    // Attempt to delete from storage (extract path from URL or store path separately)
    // Assuming fileUrl contains the path at the end for Supabase
    const pathParts = resume.fileUrl.split('/resumes/');
    if (pathParts.length > 1) {
      await storage.deleteFile(pathParts[1]);
    }

    await prisma.resume.delete({
      where: { id: resumeId },
    });

    revalidatePath("/dashboard/resumes");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete resume:", error);
    return { success: false, error: "Failed to delete resume" };
  }
}

export async function setPrimaryResumeAction(resumeId: string, userId: string) {
  try {
    // First, remove primary status from all user's resumes
    await prisma.resume.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    // Then set the selected one as primary
    const updated = await prisma.resume.update({
      where: { id: resumeId, userId },
      data: { isPrimary: true },
    });

    revalidatePath("/dashboard/resumes");
    return { success: true, resume: updated };
  } catch (error) {
    console.error("Failed to set primary resume:", error);
    return { success: false, error: "Failed to set primary resume" };
  }
}

export async function renameResumeAction(resumeId: string, userId: string, newName: string) {
  try {
    const updated = await prisma.resume.update({
      where: { id: resumeId, userId },
      data: { name: newName },
    });

    revalidatePath("/dashboard/resumes");
    return { success: true, resume: updated };
  } catch (error) {
    console.error("Failed to rename resume:", error);
    return { success: false, error: "Failed to rename resume" };
  }
}
