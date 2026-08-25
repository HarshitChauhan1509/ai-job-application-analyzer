import { z } from "zod";

export const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("Overall quality score out of 100"),
  atsScore: z.number().min(0).max(100).describe("ATS compatibility score out of 100"),
  skillsScore: z.number().min(0).max(100).describe("Skills presentation score out of 100"),
  experienceScore: z.number().min(0).max(100).describe("Experience formatting and impact score out of 100"),
  strengths: z.array(z.string()).describe("Key strengths found in the resume"),
  weaknesses: z.array(z.string()).describe("Areas of improvement for the resume"),
  missingKeywords: z.array(z.string()).describe("Common industry keywords missing from the resume"),
  recommendations: z.array(z.string()).describe("Actionable recommendations to improve the resume"),
});

export type ResumeAnalysisOutput = z.infer<typeof ResumeAnalysisSchema>;

export const JobAnalysisSchema = z.object({
  company: z.string().describe("The name of the company hiring"),
  position: z.string().describe("The job title or position"),
  experienceRequirement: z.string().describe("Required years of experience or seniority level"),
  requiredSkills: z.array(z.string()).describe("Hard skills explicitly required for the job"),
  preferredSkills: z.array(z.string()).describe("Skills listed as nice-to-have or preferred"),
  responsibilities: z.array(z.string()).describe("Key responsibilities for the role"),
  keywords: z.array(z.string()).describe("Important keywords found in the description"),
  seniority: z.string().nullable().describe("Inferred seniority level (e.g., Junior, Mid, Senior, Lead)"),
  location: z.string().nullable().describe("Job location if specified"),
  employmentType: z.string().nullable().describe("Employment type (e.g., Full-time, Contract)"),
});

export type JobAnalysisOutput = z.infer<typeof JobAnalysisSchema>;
