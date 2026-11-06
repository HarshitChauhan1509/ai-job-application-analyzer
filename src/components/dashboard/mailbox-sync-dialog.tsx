"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
  Unlink,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  getMailboxConnectionStatusAction,
  initiateGoogleMailboxConnectAction,
  simulateMockMailboxConnectAction,
  disconnectMailboxAction,
  scanAndSyncMailboxAction,
} from "@/app/actions/email-sync";
import {
  MailboxConnectionInfo,
  DiscoveredRecruiterEmail,
} from "@/lib/email-sync/types";

export function MailboxSyncDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<MailboxConnectionInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncResults, setSyncResults] = useState<{
    scanned: number;
    found: number;
    autoUpdated: number;
    emails: DiscoveredRecruiterEmail[];
  } | null>(null);

  // Load connection status on mount or when modal opens
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getMailboxConnectionStatusAction();
      if (res.success) {
        setConnection(res.connection || null);
        setIsConfigured(res.isConfigured);
      }
    } catch (e) {
      console.warn("Could not load mailbox status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check for redirect query params from OAuth callback
    if (searchParams.get("sync") === "connected") {
      toast({
        title: "Mailbox Connected! 📬",
        description: `Successfully linked your Gmail account (${searchParams.get("email") || ""}).`,
      });
      fetchStatus();
    } else if (searchParams.get("sync_error")) {
      toast({
        title: "Connection Error",
        description: searchParams.get("sync_error") || "Failed to link Gmail account.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await initiateGoogleMailboxConnectAction();
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        toast({
          title: "Connection Failed",
          description: res.error || "Could not generate authorization URL.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start Google sign-in.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateConnect = async () => {
    try {
      setLoading(true);
      const res = await simulateMockMailboxConnectAction();
      if (res.success) {
        toast({
          title: "Test Mailbox Linked! ⚡",
          description: "Candidate demo inbox connected for testing.",
        });
        await fetchStatus();
      } else {
        toast({
          title: "Simulation Failed",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this mailbox?")) return;

    try {
      setLoading(true);
      const res = await disconnectMailboxAction();
      if (res.success) {
        setConnection(null);
        setSyncResults(null);
        toast({
          title: "Mailbox Disconnected",
          description: "Your Gmail account has been unlinked.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanNow = async () => {
    setSyncing(true);
    setSyncResults(null);

    try {
      const res = await scanAndSyncMailboxAction();
      if (res.success) {
        setSyncResults({
          scanned: res.emailsScanned,
          found: res.jobEmailsFound,
          autoUpdated: res.autoUpdatedCount,
          emails: res.discoveredEmails,
        });

        toast({
          title: res.autoUpdatedCount > 0 ? "Pipeline Synchronized! 🎯" : "Mailbox Scanned! 📬",
          description: `Discovered ${res.jobEmailsFound} recruiter update(s), auto-synced ${res.autoUpdatedCount} application(s).`,
        });

        await fetchStatus();
        router.refresh();
      } else {
        toast({
          title: "Scan Failed",
          description: res.error || "Could not complete mailbox scan.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to execute scan.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = connection && connection.syncStatus !== "DISCONNECTED";

  return (
    <>
      {/* Trigger Button in Kanban Toolbar */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          fetchStatus();
        }}
        className={`text-xs h-9 gap-2 border font-medium transition-all ${
          isConnected
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
        }`}
      >
        <Mail className="h-3.5 w-3.5" />
        {isConnected ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gmail Synced</span>
          </span>
        ) : (
          <span>Connect Gmail Sync</span>
        )}
      </Button>

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Automated Mailbox Recruiter Sync
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Connect your inbox to automatically parse interview invites, test tasks, and status changes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Privacy Guarantee Note */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-foreground font-semibold">Strict Privacy Guarantee: </strong>
              CareerPilot uses read-only filters to strictly scan messages from known applicant tracking systems (Greenhouse, Lever, Ashby, Workday) and job-related keywords. Personal and financial mail is never read or stored.
            </div>
          </div>

          {!isConnected ? (
            /* State A: Not Connected */
            <div className="space-y-4 py-3 text-center">
              <div className="py-6 px-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
                  <Mail className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">No Mailbox Connected Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Link your email account to unlock automatic status tracking, timeline event logging, and interview scheduling alerts.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full sm:w-auto h-9 text-xs rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    Connect with Google OAuth
                  </Button>

                  {/* Dev mode 1-click test simulation */}
                  <Button
                    variant="outline"
                    onClick={handleSimulateConnect}
                    disabled={loading}
                    className="w-full sm:w-auto h-9 text-xs rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    ⚡ Dev Test: Connect Demo Inbox
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* State B: Connected & Active */
            <div className="space-y-4 py-2">
              {/* Active Connection Summary Card */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground font-mono">
                      {connection?.email}
                    </span>
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                      Active Sync
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last scanned:{" "}
                      {connection?.lastSyncedAt
                        ? new Date(connection.lastSyncedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                    <span>•</span>
                    <span>{connection?.syncedEmailCount || 0} emails logged</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleScanNow}
                    disabled={syncing}
                    size="sm"
                    className="text-xs h-8 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Scanning Inbox..." : "Sync Mailbox Now"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDisconnect}
                    disabled={syncing}
                    title="Disconnect Mailbox"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Sync Results Display */}
              {syncResults && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
                    <span>Scan Discovery Feed</span>
                    <span className="text-[11px] text-muted-foreground">
                      {syncResults.found} recruiter message(s) identified
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {syncResults.emails.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                        No new recruiter emails found in this scan cycle.
                      </div>
                    ) : (
                      syncResults.emails.map((msg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/50 transition-colors text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground truncate max-w-xs">
                              {msg.parsed.company} — {msg.parsed.role}
                            </span>
                            <Badge
                              className={`text-[10px] ${
                                msg.actionTaken === "AUTO_UPDATED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-primary/10 text-primary border-primary/30"
                              }`}
                            >
                              {msg.actionTaken === "AUTO_UPDATED"
                                ? `Auto-Synced ➔ ${msg.parsed.stageLabel}`
                                : msg.parsed.stageLabel}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {msg.snippet}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                            <span>From: {msg.sender}</span>
                            <span>{new Date(msg.receivedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/40 text-xs text-muted-foreground justify-between sm:justify-between items-center">
            <span>CareerPilot Automated Sync v1.0</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
