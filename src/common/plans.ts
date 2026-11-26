import { PlanTier, TenantType } from '../entities/restaurant.entity';

export interface Plan {
  tier: PlanTier;
  label: string;
  tenantType: TenantType;
  base: number;             // rupees per month
  includedBranches: number;
  includedTables: number;   // active tables only
  extraBranch: number;      // rupees per extra branch per month
  extraTable: number;       // rupees per extra active table per month
}

export const PLANS: Record<PlanTier, Plan> = {
  STANDARD_3K: { tier: 'STANDARD_3K', label: 'Standard', tenantType: 'RESTAURANT', base: 3000, includedBranches: 1, includedTables: 25, extraBranch: 1500, extraTable: 100 },
  PRO_5K: { tier: 'PRO_5K', label: 'Pro / In-mall outlet', tenantType: 'RESTAURANT', base: 5000, includedBranches: 1, includedTables: 40, extraBranch: 2500, extraTable: 100 },
  MALL_15K: { tier: 'MALL_15K', label: 'Mall food court', tenantType: 'MALL_FOOD_COURT', base: 15000, includedBranches: 1, includedTables: 150, extraBranch: 15000, extraTable: 100 },
};

/** Monthly bill = base + extra branches + extra ACTIVE tables. */
export function calcBill(tier: PlanTier, branches: number, activeTables: number) {
  const p = PLANS[tier];
  const extraBranches = Math.max(0, branches - p.includedBranches);
  const extraTables = Math.max(0, activeTables - p.includedTables);
  const extraBranchAmount = extraBranches * p.extraBranch;
  const extraTableAmount = extraTables * p.extraTable;
  return { base: p.base, extraBranches, extraTables, extraBranchAmount, extraTableAmount, total: p.base + extraBranchAmount + extraTableAmount };
}