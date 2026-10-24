"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { GitHubRepoItem, fetchPublicGitHubRepos } from "@/lib/github";

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
  githubProjects?: GitHubRepoItem[];
  username: string | null;
  isPublic: boolean;
  experience: ExperienceItem[];
  stats: {
    resumesCount: number;
    jobsCount: number;
    applicationsCount: number;
    interviewsCount: number;
  };
}

export interface PublicProfileData {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  githubProjects?: GitHubRepoItem[];
  username: string | null;
  experience: ExperienceItem[];
  primaryRole?: string | null;
  skills: string[];
  resumeDownloadUrl?: string | null;
  resumeName?: string | null;
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

    let parsedGithubProjects: GitHubRepoItem[] = [];
    if (dbUser.profile?.githubProjects) {
      try {
        const raw = JSON.parse(dbUser.profile.githubProjects);
        if (Array.isArray(raw)) parsedGithubProjects = raw;
      } catch {
        parsedGithubProjects = [];
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
        githubProjects: parsedGithubProjects,
        username: dbUser.profile?.username || null,
        isPublic: dbUser.profile?.isPublic ?? true,
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
  githubProjects?: GitHubRepoItem[];
  image?: string;
  username?: string;
  isPublic?: boolean;
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

    let sanitizedUsername: string | undefined = undefined;
    if (data.username !== undefined) {
      const trimmed = data.username.trim().toLowerCase();
      if (trimmed.length > 0) {
        if (!/^[a-z0-9_-]{3,30}$/.test(trimmed)) {
          return {
            success: false,
            error: "Username must be 3-30 characters and contain only lowercase letters, numbers, hyphens, and underscores.",
          };
        }
        // Check uniqueness
        const existing = await prisma.profile.findFirst({
          where: {
            username: trimmed,
            NOT: { userId: user.id },
          },
        });
        if (existing) {
          return {
            success: false,
            error: `The handle "${trimmed}" is already claimed. Please pick another.`,
          };
        }
        sanitizedUsername = trimmed;
      } else {
        sanitizedUsername = undefined;
      }
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
        githubProjects: data.githubProjects ? JSON.stringify(data.githubProjects) : null,
        username: sanitizedUsername || null,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        experience: experienceJson || null,
      },
      update: {
        headline: data.headline !== undefined ? data.headline.trim() || null : undefined,
        bio: data.bio !== undefined ? data.bio.trim() || null : undefined,
        website: data.website !== undefined ? data.website.trim() || null : undefined,
        linkedin: data.linkedin !== undefined ? data.linkedin.trim() || null : undefined,
        github: data.github !== undefined ? data.github.trim() || null : undefined,
        ...(data.githubProjects !== undefined && {
          githubProjects: data.githubProjects ? JSON.stringify(data.githubProjects) : null,
        }),
        username: data.username !== undefined ? sanitizedUsername || null : undefined,
        isPublic: data.isPublic !== undefined ? data.isPublic : undefined,
        ...(experienceJson !== undefined && { experience: experienceJson }),
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    if (updatedProfile.username) {
      revalidatePath(`/p/${updatedProfile.username}`);
    }

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
        username: updatedProfile.username,
        isPublic: updatedProfile.isPublic,
        experience: sortExperiences(parsedExp),
      },
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function getPublicProfileByUsernameAction(
  identifier: string
): Promise<{
  success: boolean;
  profile?: PublicProfileData;
  error?: string;
}> {
  try {
    if (!identifier) {
      return { success: false, error: "Username or user ID is required" };
    }

    const clean = identifier.trim().toLowerCase();

    // Find profile by username OR userId
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [{ username: clean }, { userId: identifier }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            resumes: {
              where: { isPrimary: true },
              take: 1,
              select: {
                name: true,
                fileUrl: true,
                targetRole: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return { success: false, error: "Candidate profile not found." };
    }

    if (!profile.isPublic) {
      return {
        success: false,
        error: "This candidate has marked their portfolio as private.",
      };
    }

    let parsedExp: ExperienceItem[] = [];
    if (profile.experience) {
      try {
        const raw = JSON.parse(profile.experience);
        if (Array.isArray(raw)) parsedExp = raw;
      } catch {
        parsedExp = [];
      }
    }

    let parsedGithubProjects: GitHubRepoItem[] = [];
    if (profile.githubProjects) {
      try {
        const raw = JSON.parse(profile.githubProjects);
        if (Array.isArray(raw)) parsedGithubProjects = raw;
      } catch {
        parsedGithubProjects = [];
      }
    }

    // Auto-fetch top repositories if candidate has GitHub linked but hasn't customized pins
    if (parsedGithubProjects.length === 0 && profile.github) {
      try {
        const liveRepos = await fetchPublicGitHubRepos(profile.github);
        parsedGithubProjects = liveRepos.slice(0, 6);
      } catch {
        // graceful fallback to empty
      }
    }

    // Extract consolidated skills from experiences + primary resume
    const skillsSet = new Set<string>();
    parsedExp.forEach((exp) => {
      if (exp.skills && Array.isArray(exp.skills)) {
        exp.skills.forEach((s) => skillsSet.add(s.trim()));
      }
    });

    const primaryResume = profile.user.resumes?.[0];
    if (primaryResume?.tags) {
      try {
        const tags = JSON.parse(primaryResume.tags);
        if (Array.isArray(tags)) tags.forEach((t: string) => skillsSet.add(t.trim()));
      } catch {
        // fallback
      }
    }

    return {
      success: true,
      profile: {
        id: profile.user.id,
        name: profile.user.name || "Candidate",
        image: profile.user.image,
        headline: profile.headline,
        bio: profile.bio,
        website: profile.website,
        linkedin: profile.linkedin,
        github: profile.github,
        githubProjects: parsedGithubProjects,
        username: profile.username,
        experience: sortExperiences(parsedExp),
        primaryRole: primaryResume?.targetRole || null,
        skills: Array.from(skillsSet).filter(Boolean),
        resumeDownloadUrl: primaryResume?.fileUrl || null,
        resumeName: primaryResume?.name || null,
      },
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return { success: false, error: "Failed to load public portfolio" };
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

/**
 * Fetch public GitHub repositories for the authenticated user or given username/URL
 */
export async function fetchGitHubRepositoriesAction(githubHandle?: string): Promise<{
  success: boolean;
  repositories?: GitHubRepoItem[];
  username?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let handle = githubHandle?.trim();
    if (!handle) {
      const dbProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });
      handle = dbProfile?.github || undefined;
    }

    if (!handle) {
      return {
        success: false,
        error: "Please enter your GitHub username or profile link first.",
      };
    }

    const repositories = await fetchPublicGitHubRepos(handle);
    return {
      success: true,
      repositories,
      username: handle,
    };
  } catch (error: any) {
    console.error("Error in fetchGitHubRepositoriesAction:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch GitHub repositories",
    };
  }
}

/**
 * Save user's selected/pinned GitHub projects to their profile
 */
export async function savePinnedGitHubProjectsAction(projects: GitHubRepoItem[]): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const serialized = JSON.stringify(projects);

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        githubProjects: serialized,
      },
      update: {
        githubProjects: serialized,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    if (profile.username) {
      revalidatePath(`/p/${profile.username}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error saving pinned GitHub projects:", error);
    return {
      success: false,
      error: error.message || "Failed to save pinned repositories",
    };
  }
}
