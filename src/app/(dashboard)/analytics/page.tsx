import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Application Funnel & Conversion Analytics | CareerPilot",
  description:
    "Real-time pipeline conversion funnel, ATS keyword correlation, response velocity, and AI mock interview growth.",
};

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const res = await getAnalyticsDataAction();

  if (!res.success || !res.data) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">Could not load analytics</h2>
        <p className="text-sm text-muted-foreground">
          {res.error || "Please refresh or try again in a few moments."}
        </p>
      </div>
    );
  }

  return <AnalyticsClient initialData={res.data} />;
}
