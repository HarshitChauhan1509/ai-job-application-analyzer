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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign, Sparkles, Building2, Briefcase, TrendingUp } from "lucide-react";
import { saveJobOfferAction, SaveJobOfferInput } from "@/app/actions/compensation";
import { calculateCompensation, formatCurrency } from "@/lib/compensation-calculator";

interface OfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  defaultCompany?: string;
  defaultRole?: string;
  initialData?: SaveJobOfferInput;
  onOfferSaved?: () => void;
}

export function OfferDialog({
  open,
  onOpenChange,
  applicationId,
  defaultCompany = "",
  defaultRole = "",
  initialData,
  onOfferSaved,
}: OfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState(initialData?.company || defaultCompany);
  const [role, setRole] = useState(initialData?.role || defaultRole);
  const [location, setLocation] = useState(initialData?.location || "San Francisco, CA (Remote)");
  const [baseSalary, setBaseSalary] = useState<number>(initialData?.baseSalary || 165000);
  const [targetBonus, setTargetBonus] = useState<number>(initialData?.targetBonus || 0);
  const [signOnBonus, setSignOnBonus] = useState<number>(initialData?.signOnBonus || 15000);
  const [equityType, setEquityType] = useState<"OPTIONS" | "RSU" | "NONE">(
    initialData?.equityType || "OPTIONS"
  );
  const [equityShares, setEquityShares] = useState<number>(initialData?.equityShares || 25000);
  const [strikePrice, setStrikePrice] = useState<number>(initialData?.strikePrice || 1.25);
  const [currentValuation, setCurrentValuation] = useState<number>(initialData?.currentValuation || 4.5);
  const [vestingYears, setVestingYears] = useState<number>(initialData?.vestingYears || 4);
  const [status, setStatus] = useState<string>(initialData?.status || "EVALUATING");
  const [notes, setNotes] = useState<string>(initialData?.notes || "");

  // Live total comp calculation
  const liveCalculation = calculateCompensation({
    baseSalary,
    targetBonus,
    signOnBonus,
    equityType,
    equityShares,
    strikePrice,
    currentValuation,
    vestingYears,
  });

  const applyPreset = (preset: "STARTUP" | "SCALEUP" | "BIGTECH") => {
    if (preset === "STARTUP") {
      setCompany(company || "Supabase");
      setRole(role || "Senior Full Stack Engineer");
      setLocation("Remote (US/EU)");
      setBaseSalary(160000);
      setTargetBonus(0);
      setSignOnBonus(15000);
      setEquityType("OPTIONS");
      setEquityShares(30000);
      setStrikePrice(1.2);
      setCurrentValuation(5.0);
      setVestingYears(4);
    } else if (preset === "SCALEUP") {
      setCompany(company || "Linear");
      setRole(role || "Staff Systems Architect");
      setLocation("San Francisco, CA");
      setBaseSalary(190000);
      setTargetBonus(19000);
      setSignOnBonus(25000);
      setEquityType("RSU");
      setEquityShares(6000);
      setStrikePrice(0);
      setCurrentValuation(12.5);
      setVestingYears(4);
    } else if (preset === "BIGTECH") {
      setCompany(company || "Stripe");
      setRole(role || "Senior Infrastructure Engineer");
      setLocation("Seattle, WA (Hybrid)");
      setBaseSalary(185000);
      setTargetBonus(27750);
      setSignOnBonus(35000);
      setEquityType("RSU");
      setEquityShares(4000);
      setStrikePrice(0);
      setCurrentValuation(25.0);
      setVestingYears(4);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError("Please provide company name and role title");
      return;
    }
    if (baseSalary <= 0) {
      setError("Please provide a valid base salary");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await saveJobOfferAction({
        id: initialData?.id,
        applicationId,
        company,
        role,
        location,
        baseSalary,
        targetBonus,
        signOnBonus,
        equityType,
        equityShares,
        strikePrice,
        currentValuation,
        vestingYears,
        status,
        notes,
      });

      if (res.success) {
        onOpenChange(false);
        if (onOfferSaved) onOfferSaved();
      } else {
        setError(res.error || "Failed to save offer");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {initialData?.id ? "Edit Job Offer" : "Log & Evaluate Job Offer"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Calculate total package value, analyze startup equity upside, and unlock AI counter-offer scripts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              <span>Quick Test Presets:</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("STARTUP")}
              className="text-xs h-8 border-dashed"
            >
              🚀 Series A Startup
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("SCALEUP")}
              className="text-xs h-8 border-dashed"
            >
              🦄 Scale-up Unicorn
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("BIGTECH")}
              className="text-xs h-8 border-dashed"
            >
              🏢 Enterprise Tech
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Company & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Linear, Stripe, Supabase"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Role *</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Work Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA (Remote)"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Offer Decision Status</Label>
              <Select value={status} onValueChange={(val) => { if (val) setStatus(val); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVALUATING">Evaluating</SelectItem>
                  <SelectItem value="COUNTERED">Counter-Offer Sent</SelectItem>
                  <SelectItem value="ACCEPTED">Offer Accepted</SelectItem>
                  <SelectItem value="DECLINED">Offer Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cash Compensation */}
          <div className="p-3 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <div className="font-semibold text-xs text-foreground flex items-center justify-between">
              <span>Cash Compensation</span>
              <span className="text-muted-foreground font-normal">
                Cash Total: {formatCurrency(baseSalary + targetBonus + signOnBonus)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Annual Base ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={baseSalary || ""}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Annual Target Bonus ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={targetBonus || ""}
                  onChange={(e) => setTargetBonus(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Sign-On Bonus ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={signOnBonus || ""}
                  onChange={(e) => setSignOnBonus(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Equity Breakdown */}
          <div className="p-3 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <div className="font-semibold text-xs text-foreground flex items-center justify-between">
              <span>Equity Grant & Vesting</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {equityType === "NONE" ? "No Equity" : `${equityType} • ${vestingYears} Yr Vest`}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Equity Type</Label>
                <Select
                  value={equityType}
                  onValueChange={(val) => {
                    if (val) setEquityType(val as "OPTIONS" | "RSU" | "NONE");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPTIONS">Stock Options</SelectItem>
                    <SelectItem value="RSU">RSUs</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Total Shares / Units</Label>
                <Input
                  type="number"
                  min="0"
                  value={equityShares || ""}
                  onChange={(e) => setEquityShares(Number(e.target.value))}
                  disabled={equityType === "NONE"}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Strike Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={strikePrice || ""}
                  onChange={(e) => setStrikePrice(Number(e.target.value))}
                  disabled={equityType !== "OPTIONS"}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Est. 409A / Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentValuation || ""}
                  onChange={(e) => setCurrentValuation(Number(e.target.value))}
                  disabled={equityType === "NONE"}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Live Calculated Compensation Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-background to-primary/10 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Projected Year 1 Total Comp (TC)
              </div>
              <div className="text-2xl font-black text-emerald-500 font-mono tracking-tight">
                {formatCurrency(liveCalculation.year1TotalCompensation)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Base: {formatCurrency(liveCalculation.annualBase)} • Sign-on: {formatCurrency(liveCalculation.firstYearSignOn)} • Equity/Yr: {formatCurrency(liveCalculation.annualEquityValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground font-medium">4-Year Package</div>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(liveCalculation.fourYearTotalCompensation)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {liveCalculation.cashCompensationPercentage}% Cash / {liveCalculation.equityCompensationPercentage}% Equity
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} />
                  <span>Save & Evaluate Offer</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
