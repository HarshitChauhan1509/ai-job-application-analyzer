import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { AICopilot } from "@/components/dashboard/ai-copilot";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible print:block print:bg-white">
      <div className="print:hidden flex">
        <Sidebar className="hidden md:flex" />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header user={user} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/10 relative print:overflow-visible print:p-0 print:bg-white">
          {children}
          <div className="print:hidden">
            <AICopilot />
          </div>
        </main>
      </div>
    </div>
  );
}
