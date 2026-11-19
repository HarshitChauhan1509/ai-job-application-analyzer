/**
 * Compensation & Startup Equity Valuation Calculator
 * Computes Year 1 Total Comp, multi-year trajectories, and equity upside models
 */

export interface CompensationInput {
  baseSalary: number;
  targetBonus?: number;
  signOnBonus?: number;
  equityType?: "OPTIONS" | "RSU" | "NONE";
  equityShares?: number;
  strikePrice?: number;
  currentValuation?: number; // Estimated 409A / current share price
  vestingYears?: number;
  vestingCliffMonths?: number;
}

export interface EquityUpsideScenario {
  multiplier: number;
  scenarioName: string;
  sharePrice: number;
  perShareGain: number;
  annualEquityValue: number;
  fourYearEquityValue: number;
  year1TotalComp: number;
}

export interface CompensationBreakdown {
  annualBase: number;
  annualBonus: number;
  firstYearSignOn: number;
  annualEquityValue: number;
  fourYearEquityValue: number;
  year1TotalCompensation: number;
  year2To4AnnualTC: number;
  fourYearTotalCompensation: number;
  cashCompensationPercentage: number;
  equityCompensationPercentage: number;
  scenarios: EquityUpsideScenario[];
}

/**
 * Calculates deterministic total compensation breakdown and multi-scenario equity modeling
 */
export function calculateCompensation(input: CompensationInput): CompensationBreakdown {
  const base = Math.max(0, input.baseSalary || 0);
  const bonus = Math.max(0, input.targetBonus || 0);
  const signOn = Math.max(0, input.signOnBonus || 0);
  const equityType = input.equityType || "OPTIONS";
  const shares = Math.max(0, input.equityShares || 0);
  const strike = Math.max(0, input.strikePrice || 0);
  const currentSharePrice = Math.max(0, input.currentValuation || 0);
  const vestingYears = Math.max(1, input.vestingYears || 4);

  // Per share value at current 409A / fair market price
  let currentPerShareGain = 0;
  if (equityType === "RSU") {
    currentPerShareGain = currentSharePrice;
  } else if (equityType === "OPTIONS") {
    currentPerShareGain = Math.max(0, currentSharePrice - strike);
  }

  const fourYearEquityValue = equityType === "NONE" ? 0 : shares * currentPerShareGain;
  const annualEquityValue = fourYearEquityValue / vestingYears;

  const year1TotalCompensation = base + bonus + signOn + annualEquityValue;
  const year2To4AnnualTC = base + bonus + annualEquityValue;
  const fourYearTotalCompensation = base * vestingYears + bonus * vestingYears + signOn + fourYearEquityValue;

  const totalYear1Cash = base + bonus + signOn;
  const cashCompensationPercentage =
    year1TotalCompensation > 0 ? Math.round((totalYear1Cash / year1TotalCompensation) * 100) : 100;
  const equityCompensationPercentage = Math.max(0, 100 - cashCompensationPercentage);

  // Compute 4 upside scenarios
  const scenarioDefinitions = [
    { multiplier: 1, name: "1x Baseline (Current 409A)" },
    { multiplier: 3, name: "3x Growth (Next Funding Round)" },
    { multiplier: 5, name: "5x Expansion (Scale-up Valuation)" },
    { multiplier: 10, name: "10x Unicorn Exit (IPO / Acquisition)" },
  ];

  const scenarios: EquityUpsideScenario[] = scenarioDefinitions.map((def) => {
    let projectedPrice = currentSharePrice * def.multiplier;
    // Fallback if currentSharePrice wasn't provided but strike was
    if (projectedPrice === 0 && strike > 0) {
      projectedPrice = strike * def.multiplier;
    }

    let projectedGain = 0;
    if (equityType === "RSU") {
      projectedGain = projectedPrice;
    } else if (equityType === "OPTIONS") {
      projectedGain = Math.max(0, projectedPrice - strike);
    }

    const fourYearVal = equityType === "NONE" ? 0 : shares * projectedGain;
    const annualVal = fourYearVal / vestingYears;
    const y1TC = base + bonus + signOn + annualVal;

    return {
      multiplier: def.multiplier,
      scenarioName: def.name,
      sharePrice: projectedPrice,
      perShareGain: projectedGain,
      annualEquityValue: Math.round(annualVal),
      fourYearEquityValue: Math.round(fourYearVal),
      year1TotalComp: Math.round(y1TC),
    };
  });

  return {
    annualBase: Math.round(base),
    annualBonus: Math.round(bonus),
    firstYearSignOn: Math.round(signOn),
    annualEquityValue: Math.round(annualEquityValue),
    fourYearEquityValue: Math.round(fourYearEquityValue),
    year1TotalCompensation: Math.round(year1TotalCompensation),
    year2To4AnnualTC: Math.round(year2To4AnnualTC),
    fourYearTotalCompensation: Math.round(fourYearTotalCompensation),
    cashCompensationPercentage,
    equityCompensationPercentage,
    scenarios,
  };
}

/**
 * Currency formatter with compact symbol representation
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact currency display (e.g. $185k, $1.2M)
 */
export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}k`;
  }
  return `$${amount.toLocaleString()}`;
}
