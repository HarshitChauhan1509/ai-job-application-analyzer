export type MailboxProvider = "GOOGLE" | "OUTLOOK";
export type MailboxSyncStatus = "CONNECTED" | "SYNCING" | "ERROR" | "DISCONNECTED";

export interface MailboxConnectionInfo {
  id: string;
  provider: MailboxProvider;
  email: string;
  syncStatus: MailboxSyncStatus;
  lastSyncedAt: Date | null;
  errorMessage?: string | null;
  syncedEmailCount: number;
}

export interface DiscoveredRecruiterEmail {
  messageId: string;
  sender: string;
  subject: string;
  receivedAt: Date;
  snippet: string;
  parsed: {
    company: string;
    role: string;
    detectedStage: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED";
    stageLabel: string;
    summary: string;
    actionRequired?: string;
    interviewDate?: string;
  };
  matchingApplicationId?: string | null;
  matchingCompany?: string | null;
  statusChangeRequired: boolean;
  actionTaken?: "AUTO_UPDATED" | "SUGGESTED" | "IGNORED";
}

export interface MailboxSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  emailsScanned: number;
  jobEmailsFound: number;
  autoUpdatedCount: number;
  discoveredEmails: DiscoveredRecruiterEmail[];
}
