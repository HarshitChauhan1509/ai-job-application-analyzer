import { getCurrentUser } from "@/lib/auth";
import { getProfileDataAction } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const res = await getProfileDataAction();
  if (!res.success || !res.profile) {
    redirect("/dashboard");
  }

  return <ProfileClient initialProfile={res.profile} />;
}
