"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, Check, ExternalLink, Sparkles, Folder, ArrowRight, ShieldCheck } from "lucide-react";

interface ExtensionGuideDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean;
}

export function ExtensionGuideDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton = true,
}: ExtensionGuideDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const extensionFolderPath = "ai-job-application-analyzer/extension";

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionFolderPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <>
      {triggerButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 gap-2 text-xs font-semibold border-border/80 hover:border-primary/40 bg-card/60 shadow-xs"
        >
          <Globe size={14} className="text-primary" />
          <span>Browser Extension</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-0.5">
            New
          </Badge>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Globe size={22} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  1-Click Browser Web Clipper (Manifest V3)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Clip jobs directly from LinkedIn, Indeed, Greenhouse, Lever, and Ashby into your Kanban pipeline.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-1">
            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Instant ATS Match:</strong>
                  <p className="text-muted-foreground text-[11px]">Computes fit against your primary resume automatically.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Direct Outreach:</strong>
                  <p className="text-muted-foreground text-[11px]">1-click jumps straight into Founder Cold Outreach.</p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                How to Install (30 Seconds):
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-card/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Open Extensions in Chrome or Edge</p>
                    <p className="text-muted-foreground text-[11px]">
                      Navigate to <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">chrome://extensions</code> or <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">edge://extensions</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-card/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Enable Developer Mode</p>
                    <p className="text-muted-foreground text-[11px]">
                      Turn on the <strong>Developer mode</strong> toggle located in the top-right corner.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-card/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                    3
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Click &ldquo;Load unpacked&rdquo; and Select Folder</p>
                    <p className="text-muted-foreground text-[11px]">
                      Select the <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">extension</code> folder from your local workspace:
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 p-2 rounded-md bg-muted/60 font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <Folder size={12} className="shrink-0" />
                        <span className="truncate">{extensionFolderPath}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPath}
                        className="h-8 gap-1.5 text-xs shrink-0"
                      >
                        {copiedPath ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy Path</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>
                Done! The CareerPilot extension icon will now appear in your browser toolbar ready to clip any job posting.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
