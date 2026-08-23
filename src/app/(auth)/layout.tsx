import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group absolute top-8 left-8">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:scale-105 transition-transform">
          <Briefcase size={20} />
        </div>
        <span className="font-semibold text-xl tracking-tight">CareerPilot</span>
      </Link>
      
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
