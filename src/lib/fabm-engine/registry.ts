// ============================================================
// METHOD REGISTRY — every organisation from the corrected
// taxonomy diagram, mapped to its engine. This is the single
// source of truth: org name -> fabmType -> engine + config.
// ============================================================
import type { FabmType } from "./types.ts";

export interface MethodDefinition {
  id: string;
  label: string;
  fabmType: FabmType;
  founded: string;
  secular: boolean;
  engineConfig?: Record<string, unknown>;
  notes?: string;
}

export const METHOD_REGISTRY: MethodDefinition[] = [
  // ── SYMPTOTHERMAL DOUBLE-CHECK ──
  { id: "sensiplan", label: "Sensiplan", fabmType: "symptothermal_double_check",
    founded: "Germany, 1980s (Arbeitsgruppe NFP / Malteser International)", secular: true,
    notes: "Best-evidenced FABM. 99.6% perfect-use, 98.2% typical-use (Frank-Herrmann 2007)." },
  { id: "nfpta_uk", label: "NFPTA (UK)", fabmType: "symptothermal_double_check",
    founded: "UK, 1976 — Dr. John Kelly & Dr. Anna Flynn, Birmingham Maternity Hospital", secular: true },
  { id: "fertility_uk", label: "Fertility UK", fabmType: "symptothermal_double_check",
    founded: "UK — Jane Knight (trained under Dr. Elizabeth Clubb, 1970s)", secular: true,
    notes: "Often delivered via NHS services. Distinct organisation from NFPTA." },
  { id: "natural_fertility_nz", label: "Natural Fertility NZ", fabmType: "symptothermal_double_check",
    founded: "New Zealand, 1974 (NZ Dept of Health grants from 1980)", secular: true },
  { id: "symptopro", label: "SymptoPro Fertility Education", fabmType: "symptothermal_double_check",
    founded: "USA, 1977 — Mike & Rose Fuller, with Dr. Josef Roetzer", secular: false,
    notes: "Catholic. Co-developed directly with Roetzer, the STM double-check originator." },
  { id: "ccl", label: "Couple to Couple League", fabmType: "symptothermal_double_check",
    founded: "USA, 1971 — John & Sheila Kippley with Dr. Konald Prem", secular: false },
  { id: "nfpi", label: "Natural Family Planning International", fabmType: "symptothermal_double_check",
    founded: "USA, 2004 — John & Sheila Kippley (founders of CCL)", secular: false,
    notes: "Second method from CCL's founders, built on 30 years of CCL experience." },
  { id: "symptotherm_foundation", label: "SymptoTherm Foundation", fabmType: "symptothermal_double_check",
    founded: "Switzerland, mid-2000s — Harri Wettstein & Christine Bourgeois", secular: true,
    notes: "Built around the proprietary Sympto app algorithm." },
  { id: "serena_canada", label: "Serena Canada", fabmType: "symptothermal_double_check",
    founded: "Canada, 1955", secular: false,
    notes: "Catholic, English-speaking provinces. Some double-check aspects + basic temp protocol." },
  { id: "serena_quebec", label: "Serena Quebec", fabmType: "symptothermal_double_check",
    founded: "Canada (Quebec)", secular: true,
    notes: "Secular branch of Serena, primarily French-speaking." },

  // ── SYMPTOTHERMAL SINGLE-CHECK ──
  { id: "nfe_australia", label: "Natural Fertility Education Australia", fabmType: "symptothermal_single_check",
    founded: "Australia — Dr. Kerry Hampton (Wise Woman Business)", secular: true,
    notes: "Hampton trained in Billings (1991) before founding this method. Some double-check aspects + basic temp protocol." },
  { id: "justisse", label: "Justisse", fabmType: "symptothermal_single_check",
    founded: "Canada, 1987 — Dr. Geraldine Matus", secular: true,
    notes: "Matus trained in Billings, Serena Canada, CCL, and Creighton before founding Justisse." },
  { id: "the_well", label: "The Well (formerly Grace of the Moon)", fabmType: "symptothermal_single_check",
    founded: "USA, 2011 — midwife Sarah Bly", secular: true },
  { id: "tcoyf", label: "Taking Charge of Your Fertility (book)", fabmType: "symptothermal_single_check",
    founded: "Toni Weschler (book)", secular: true,
    notes: "Designed to be self-taught. ~98% perfect-use per author's Appendix D. TCOYF-trained educators available in Israel." },

  // ── CERVICAL MUCUS-ONLY ──
  { id: "billings", label: "Billings Ovulation Method", fabmType: "cervical_mucus_only",
    founded: "Australia, 1953 — Drs John & Evelyn Billings", secular: false,
    engineConfig: { mode: "billings" },
    notes: "Focuses on vulvar (walking) sensation. One of the most comprehensive mucus-only methods." },
  { id: "creighton", label: "Creighton Model FertilityCare System", fabmType: "cervical_mucus_only",
    founded: "USA, 1970s — Dr. Thomas Hilgers, Diane Daly, Ann Prebil", secular: false,
    engineConfig: { mode: "creighton" },
    notes: "Modification of Billings. Standardised numeric/letter mucus categorisation + wiping sensation. NaProTechnology medical branch." },

  // ── SYMPTOHORMONAL ──
  { id: "femm", label: "FEMM", fabmType: "symptohormonal",
    founded: "USA — Anna Halpine (World Youth Alliance)", secular: true,
    notes: "Secular method with Catholic background. Affiliated Reproductive Health Research Institute." },
  { id: "marquette", label: "Marquette Method", fabmType: "symptohormonal",
    founded: "USA, 1999 — Dr. Richard Fehring, Marquette University", secular: false },
  { id: "boston_cross_check", label: "Boston Cross Check", fabmType: "symptohormonal",
    founded: "USA", secular: false,
    engineConfig: { useBBTCrossCheck: true } },

  // ── CALCULOTHERMAL (not usually recommended) ──
  { id: "natural_cycles", label: "Natural Cycles", fabmType: "calculothermal",
    founded: "Sweden, 2013", secular: true,
    notes: "Calculation from past cycles + BBT. FDA-cleared for contraception, but flagged here per community taxonomy as calculothermal." },
  { id: "daysy", label: "Daysy", fabmType: "calculothermal",
    founded: "Germany", secular: true,
    notes: "Effectiveness claims rest on a retracted study (Reproductive Health, 2019)." },

  // ── CALENDAR-ONLY (not usually recommended) ──
  { id: "rhythm", label: "Rhythm Method (Calendar / Knaus-Ogino)", fabmType: "calendar_only",
    founded: "1920s-30s — Ogino & Knaus", secular: true,
    notes: "Least effective method type. Largely superseded by Standard Days Method." },
];

export function getMethodsByType(fabmType: FabmType): MethodDefinition[] {
  return METHOD_REGISTRY.filter((m) => m.fabmType === fabmType);
}

export function getMethod(id: string): MethodDefinition | undefined {
  return METHOD_REGISTRY.find((m) => m.id === id);
}
