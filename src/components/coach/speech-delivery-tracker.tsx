"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SpeechDeliveryTrackerProps {
  text: string;
  recordingSeconds: number;
  isRecording: boolean;
}

const COMMON_FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "sort of",
  "kind of",
  "literally",
];

export function SpeechDeliveryTracker({
  text,
  recordingSeconds,
  isRecording,
}: SpeechDeliveryTrackerProps) {
  const { wordCount, wpm, wpmStatus, fillerMatches, totalFillers } = useMemo(() => {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        wordCount: 0,
        wpm: 0,
        wpmStatus: "IDLE",
        fillerMatches: [],
        totalFillers: 0,
      };
    }

    const words = cleanText.split(/\s+/).filter(Boolean);
    const count = words.length;

    // Calculate WPM only if at least 4 seconds have passed
    let calculatedWpm = 0;
    if (recordingSeconds >= 4) {
      const minutes = recordingSeconds / 60;
      calculatedWpm = Math.round(count / minutes);
    }

    let status: "SLOW" | "OPTIMAL" | "FAST" | "IDLE" = "IDLE";
    if (calculatedWpm > 0) {
      if (calculatedWpm < 110) status = "SLOW";
      else if (calculatedWpm <= 165) status = "OPTIMAL";
      else status = "FAST";
    }

    // Detect Filler Words
    const lower = ` ${cleanText.toLowerCase().replace(/[^\w\s']/g, " ")} `;
    const foundFillers: Array<{ word: string; count: number }> = [];
    let fillerSum = 0;

    COMMON_FILLER_WORDS.forEach((filler) => {
      const regex = new RegExp(`\\s${filler}\\s`, "gi");
      const matches = lower.match(regex);
      if (matches && matches.length > 0) {
        foundFillers.push({ word: filler, count: matches.length });
        fillerSum += matches.length;
      }
    });

    return {
      wordCount: count,
      wpm: calculatedWpm,
      wpmStatus: status,
      fillerMatches: foundFillers,
      totalFillers: fillerSum,
    };
  }, [text, recordingSeconds]);

  if (!isRecording && wordCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs py-1.5 px-3 bg-muted/30 border-t border-border/40">
      {/* Words Count */}
      <span className="text-[11px] text-muted-foreground font-medium">
        {wordCount} words
      </span>

      {/* Speaking Cadence / WPM */}
      {wpm > 0 && (
        <Badge
          variant="outline"
          className={`text-[10px] gap-1 font-mono ${
            wpmStatus === "OPTIMAL"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : wpmStatus === "SLOW"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
          }`}
        >
          <Gauge className="h-3 w-3" />
          {wpm} WPM • {wpmStatus === "OPTIMAL" ? "Optimal Pace" : wpmStatus === "SLOW" ? "Deliberate" : "Brisk Pace"}
        </Badge>
      )}

      {/* Filler Words Pill */}
      {wordCount > 10 && (
        <>
          {totalFillers === 0 ? (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            >
              <CheckCircle2 className="h-3 w-3" /> 0 Fillers (Clean delivery)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              title={fillerMatches.map((f) => `"${f.word}": ${f.count}`).join(", ")}
            >
              <AlertTriangle className="h-3 w-3" />
              {totalFillers} {totalFillers === 1 ? "Filler" : "Fillers"} (
              {fillerMatches.slice(0, 2).map((f) => `"${f.word}"`).join(", ")}
              {fillerMatches.length > 2 ? "..." : ""})
            </Badge>
          )}
        </>
      )}
    </div>
  );
}
