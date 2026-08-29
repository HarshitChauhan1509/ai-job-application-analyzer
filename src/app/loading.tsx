import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-[60vh] w-full flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm font-medium">Loading content...</p>
    </div>
  );
}
