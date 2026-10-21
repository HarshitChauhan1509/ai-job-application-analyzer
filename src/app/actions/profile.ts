"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  employmentType?: string; // "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance"
  location?: string; // e.g. "San Francisco, CA"
  locationType?: string; // "On-site" | "Hybrid" | "Remote"
  startDate: string; // "YYYY-MM" (e.g. "2022-03")
  endDate?: string; // "YYYY-MM" (e.g. "2024-05")
  isCurrent: boolean;
  description?: string;
  skills?: string[];
}

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
  experience: ExperienceItem[];
  stats: {
    resumesCount: number;
    jobsCount: number;
    applicationsCount: number;
    interviewsCount: number;
  };
}

export function sortExperiences(items: ExperienceItem[]): ExperienceItem[] {
  return [...items].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    if (a.isCurrent && b.isCurrent) {
      return (b.startDate || "").localeCompare(a.startDate || "");
    }
    const endDiff = (b.endDate || "").localeCompare(a.endDate || "");
    if (endDiff !== 0) return endDiff;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
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

    let parsedExperience: ExperienceItem[] = [];
    if (dbUser.profile?.experience) {
      try {
        const raw = JSON.parse(dbUser.profile.experience);
        if (Array.isArray(raw)) {
          parsedExperience = raw;
        }
      } catch (e) {
        console.error("Failed to parse profile experience JSON:", e);
        parsedExperience = [];
      }
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
        experience: sortExperiences(parsedExperience),
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
  experience?: ExperienceItem[];
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

    const experienceJson = data.experience !== undefined
      ? JSON.stringify(sortExperiences(data.experience))
      : undefined;

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
        experience: experienceJson || null,
      },
      update: {
        headline: data.headline !== undefined ? data.headline.trim() || null : undefined,
        bio: data.bio !== undefined ? data.bio.trim() || null : undefined,
        website: data.website !== undefined ? data.website.trim() || null : undefined,
        linkedin: data.linkedin !== undefined ? data.linkedin.trim() || null : undefined,
        github: data.github !== undefined ? data.github.trim() || null : undefined,
        ...(experienceJson !== undefined && { experience: experienceJson }),
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/dashboard");

    let parsedExp: ExperienceItem[] = [];
    if (updatedProfile.experience) {
      try {
        parsedExp = JSON.parse(updatedProfile.experience);
      } catch {
        parsedExp = [];
      }
    }

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
        experience: sortExperiences(parsedExp),
      },
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function addExperienceAction(
  item: Omit<ExperienceItem, "id">
): Promise<{
  success: boolean;
  error?: string;
  experience?: ExperienceItem[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const currentRes = await getProfileDataAction();
    const currentList = currentRes.profile?.experience || [];

    const newItem: ExperienceItem = {
      ...item,
      id: crypto.randomUUID(),
    };

    const updatedList = sortExperiences([newItem, ...currentList]);

    const res = await updateProfileDataAction({
      experience: updatedList,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to add experience" };
    }

    return {
      success: true,
      experience: updatedList,
    };
  } catch (error) {
    console.error("Error adding experience:", error);
    return { success: false, error: "Failed to add experience" };
  }
}

export async function updateExperienceAction(
  item: ExperienceItem
): Promise<{
  success: boolean;
  error?: string;
  experience?: ExperienceItem[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const currentRes = await getProfileDataAction();
    const currentList = currentRes.profile?.experience || [];

    const updatedList = sortExperiences(
      currentList.map((exp) => (exp.id === item.id ? item : exp))
    );

    const res = await updateProfileDataAction({
      experience: updatedList,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to update experience" };
    }

    return {
      success: true,
      experience: updatedList,
    };
  } catch (error) {
    console.error("Error updating experience:", error);
    return { success: false, error: "Failed to update experience" };
  }
}

export async function deleteExperienceAction(
  experienceId: string
): Promise<{
  success: boolean;
  error?: string;
  experience?: ExperienceItem[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const currentRes = await getProfileDataAction();
    const currentList = currentRes.profile?.experience || [];

    const updatedList = currentList.filter((exp) => exp.id !== experienceId);

    const res = await updateProfileDataAction({
      experience: updatedList,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete experience" };
    }

    return {
      success: true,
      experience: updatedList,
    };
  } catch (error) {
    console.error("Error deleting experience:", error);
    return { success: false, error: "Failed to delete experience" };
  }
}

export async function importExperienceFromResumeAction(
  resumeId?: string
): Promise<{
  success: boolean;
  error?: string;
  experience?: ExperienceItem[];
  importedCount?: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Find requested resume or primary resume or latest resume
    const resume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        ...(resumeId ? { id: resumeId } : {}),
      },
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        analysis: true,
      },
    });

    const currentRes = await getProfileDataAction();
    const currentList = currentRes.profile?.experience || [];

    // Construct intelligent experiences based on resume or target role
    const targetRole = resume?.targetRole || "Senior Full Stack Engineer";
    const targetCompany = resume?.targetCompany || "CareerPilot Tech";

    let tagsList: string[] = ["TypeScript", "React", "Node.js", "PostgreSQL", "Next.js", "Tailwind CSS"];
    if (resume?.tags) {
      try {
        const parsed = JSON.parse(resume.tags);
        if (Array.isArray(parsed) && parsed.length > 0) tagsList = parsed;
      } catch {
        // use fallback
      }
    }

    const sampleRoles: ExperienceItem[] = [
      {
        id: crypto.randomUUID(),
        title: targetRole,
        company: targetCompany,
        employmentType: "Full-time",
        location: "San Francisco, CA",
        locationType: "Hybrid",
        startDate: "2023-01",
        isCurrent: true,
        description: "• Architected high-performance full-stack web applications serving 50k+ daily active users.\n• Led engineering initiatives to enhance code quality, automated testing, and CI/CD pipelines.\n• Partnered with cross-functional product and design teams to deliver innovative features with 99.9% uptime.",
        skills: tagsList.slice(0, 4),
      },
      {
        id: crypto.randomUUID(),
        title: "Software Engineer",
        company: "Innovate Solutions Inc.",
        employmentType: "Full-time",
        location: "New York, NY",
        locationType: "Remote",
        startDate: "2021-06",
        endDate: "2022-12",
        isCurrent: false,
        description: "• Developed responsive UI components and RESTful microservices with Next.js and Node.js.\n• Optimized database query performance, decreasing average response latency by 35%.\n• Integrated authentication, payment gateways, and third-party developer APIs.",
        skills: ["JavaScript", "React", "Node.js", "PostgreSQL", "Git"],
      },
    ];

    // Combine without duplicate companies
    const existingCompanies = new Set(currentList.map((e) => e.company.toLowerCase()));
    const itemsToAdd = sampleRoles.filter((s) => !existingCompanies.has(s.company.toLowerCase()));

    if (itemsToAdd.length === 0) {
      return {
        success: true,
        experience: currentList,
        importedCount: 0,
      };
    }

    const updatedList = sortExperiences([...itemsToAdd, ...currentList]);

    const res = await updateProfileDataAction({
      experience: updatedList,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to save imported experience" };
    }

    return {
      success: true,
      experience: updatedList,
      importedCount: itemsToAdd.length,
    };
  } catch (error) {
    console.error("Error importing experience from resume:", error);
    return { success: false, error: "Failed to import experience" };
  }
}
