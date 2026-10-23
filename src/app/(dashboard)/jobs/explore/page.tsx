import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCuratedJobsAction } from "@/app/actions/curated-jobs";
import { ExploreClient } from "./explore-client";

export const metadata: Metadata = {
  title: "Explore Curated Startup Roles | CareerPilot",
  description: "Browse curated high-growth startup openings with automated ATS matching and 1-click founder outreach.",
};

export default async function ExploreJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const res = await getCuratedJobsAction();
  const jobs = res.success && res.jobs ? res.jobs : [];
  const hasPrimaryResume = Boolean(res.hasPrimaryResume);

  return <ExploreClient initialJobs={jobs} hasPrimaryResume={hasPrimaryResume} />;
}
