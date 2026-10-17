"use server";

import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

/**
 * Stores a resume record in the database after the file is uploaded.
 * Supports multiple resume types (Frontend, Backend, Full Stack, DevOps, etc.)
 * and target job / target company associations.
 */
export async function uploadResumeAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const customName = formData.get("name") as string | null;
    const resumeType = (formData.get("resumeType") as string) || "GENERAL";
    const targetRole = (formData.get("targetRole") as string) || null;
    const targetCompany = (formData.get("targetCompany") as string) || null;
    const targetJobId = (formData.get("targetJobId") as string) || null;
    const tags = (formData.get("tags") as string) || null;

    if (!file || !userId) {
      return { success: false, error: "File and userId are required" };
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = customName?.trim() || file.name;
    const contentType = file.type;

    // 1. Upload to storage
    const path = `${userId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { url } = await storage.uploadFile(path, fileBuffer, contentType);

    // 2. Save to database
    const resume = await prisma.resume.create({
      data: {
        userId,
        name: fileName,
        fileUrl: url,
        resumeType,
        targetRole: targetRole?.trim() || null,
        targetCompany: targetCompany?.trim() || null,
        targetJobId: targetJobId && targetJobId !== "none" ? targetJobId : null,
        tags: tags?.trim() || null,
        // Mark as primary if it's their first resume
        isPrimary: (await prisma.resume.count({ where: { userId } })) === 0,
      },
    });

    revalidatePath("/resumes");
    revalidatePath("/dashboard/resumes");
    return { success: true, resume };
  } catch (error) {
    console.error("Failed to create resume:", error);
    return { success: false, error: "Failed to upload and create resume" };
  }
}

/**
 * Updates metadata for a resume (target role, resume type, target company, tags, name).
 */
export async function updateResumeMetadataAction(params: {
  resumeId: string;
  userId: string;
  name?: string;
  resumeType?: string;
  targetRole?: string;
  targetCompany?: string;
  targetJobId?: string;
  tags?: string;
}) {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: params.resumeId },
    });

    if (!resume || resume.userId !== params.userId) {
      throw new Error("Unauthorized or not found");
    }

    const updated = await prisma.resume.update({
      where: { id: params.resumeId },
      data: {
        ...(params.name ? { name: params.name.trim() } : {}),
        ...(params.resumeType !== undefined ? { resumeType: params.resumeType } : {}),
        ...(params.targetRole !== undefined ? { targetRole: params.targetRole?.trim() || null } : {}),
        ...(params.targetCompany !== undefined ? { targetCompany: params.targetCompany?.trim() || null } : {}),
        ...(params.targetJobId !== undefined
          ? { targetJobId: params.targetJobId === "none" ? null : params.targetJobId }
          : {}),
        ...(params.tags !== undefined ? { tags: params.tags?.trim() || null } : {}),
      },
    });

    revalidatePath("/resumes");
    revalidatePath(`/resumes/${params.resumeId}`);
    return { success: true, resume: updated };
  } catch (error) {
    console.error("Failed to update resume metadata:", error);
    return { success: false, error: "Failed to update resume" };
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

    // Attempt to delete from storage
    const pathParts = resume.fileUrl.split('/resumes/');
    if (pathParts.length > 1) {
      await storage.deleteFile(pathParts[1]);
    }

    await prisma.resume.delete({
      where: { id: resumeId },
    });

    revalidatePath("/resumes");
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

    revalidatePath("/resumes");
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

    revalidatePath("/resumes");
    revalidatePath("/dashboard/resumes");
    return { success: true, resume: updated };
  } catch (error) {
    console.error("Failed to rename resume:", error);
    return { success: false, error: "Failed to rename resume" };
  }
}

/**
 * Retrieves a resume by ID with its analysis.
 */
export async function getResumeByIdAction(resumeId: string) {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        analysis: true,
      },
    });

    if (!resume) {
      return { success: false, error: "Resume not found" };
    }

    return { success: true, resume };
  } catch (error) {
    console.error("Error fetching resume:", error);
    return { success: false, error: "Failed to fetch resume" };
  }
}
