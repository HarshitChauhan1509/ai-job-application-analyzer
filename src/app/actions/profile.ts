"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  stats: {
    resumesCount: number;
    jobsCount: number;
    applicationsCount: number;
    interviewsCount: number;
  };
}

export async function getProfileDataAction(): Promise<{
  success: boolean;
  profile?: ProfileData;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        _count: {
          select: {
            resumes: true,
            jobs: true,
            applications: true,
            interviewSessions: true,
          },
        },
      },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      profile: {
        id: dbUser.id,
        name: dbUser.name || "User",
        email: dbUser.email || "",
        image: dbUser.image,
        headline: dbUser.profile?.headline || null,
        bio: dbUser.profile?.bio || null,
        website: dbUser.profile?.website || null,
        linkedin: dbUser.profile?.linkedin || null,
        github: dbUser.profile?.github || null,
        stats: {
          resumesCount: dbUser._count.resumes,
          jobsCount: dbUser._count.jobs,
          applicationsCount: dbUser._count.applications,
          interviewsCount: dbUser._count.interviewSessions,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return { success: false, error: "Failed to load profile" };
  }
}

export async function updateProfileDataAction(data: {
  name?: string;
  headline?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  image?: string;
}): Promise<{
  success: boolean;
  error?: string;
  profile?: Partial<ProfileData>;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update user table
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.image !== undefined && { image: data.image.trim() }),
      },
    });

    // Upsert profile record
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: data.headline?.trim() || null,
        bio: data.bio?.trim() || null,
        website: data.website?.trim() || null,
        linkedin: data.linkedin?.trim() || null,
        github: data.github?.trim() || null,
      },
      update: {
        headline: data.headline !== undefined ? data.headline.trim() || null : undefined,
        bio: data.bio !== undefined ? data.bio.trim() || null : undefined,
        website: data.website !== undefined ? data.website.trim() || null : undefined,
        linkedin: data.linkedin !== undefined ? data.linkedin.trim() || null : undefined,
        github: data.github !== undefined ? data.github.trim() || null : undefined,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
      profile: {
        id: updatedUser.id,
        name: updatedUser.name || "User",
        email: updatedUser.email || "",
        image: updatedUser.image,
        headline: updatedProfile.headline,
        bio: updatedProfile.bio,
        website: updatedProfile.website,
        linkedin: updatedProfile.linkedin,
        github: updatedProfile.github,
      },
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
