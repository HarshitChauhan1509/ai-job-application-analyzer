import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ApplicationsClient({ initialApplications }: { initialApplications: any[] }) {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
          <p className="text-muted-foreground mt-1">Manage your job applications through the pipeline.</p>
        </div>
        <Link href="/jobs" className="w-full sm:w-auto">
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialApplications={initialApplications} />
      </div>
    </div>
  );
}
