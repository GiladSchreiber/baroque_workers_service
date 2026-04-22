/**
 * Real-data validation — March 2026
 *
 * Source: payroll spreadsheet provided by the business owner.
 * The "שכר" column in the source already has the tip bonus applied where
 * applicable (MAX(0, tip − 15×hours)).  Tips in this data were manually
 * assigned per worker; they are NOT the output of computeTipDistribution —
 * so this file tests only that calcSalary() is arithmetically correct.
 *
 * Wages derived from the data:
 *   ₪45/hr — ליאב, ענבר, סופיה, נועה פ, צ'יבוטרו, רפאל, שחר, סיני
 *   ₪40/hr — אילה, חיים, דפנה, ג'וליה, יותם
 *
 * Note: Day 27 tips do not sum to the day total in the source (115 ≠ 161);
 * individual shift salaries are still verifiable and are included.
 */

import { describe, it, expect } from 'vitest'
import { calcSalary } from './utils'

const W: Record<string, number> = {
  'ליאב': 45, 'ענבר': 45, 'סופיה': 45, "נועה פ": 45,
  "צ'יבוטרו": 45, 'רפאל': 45, 'שחר': 45, 'סיני': 45,
  'אילה': 40, 'חיים': 40, 'דפנה': 40, "ג'וליה": 40, 'יותם': 40,
}

interface Row {
  day: number
  worker: string
  reg: number
  shab: number
  sup: number
  tip: number
  expected: number
  note?: string
}

const DATA: Row[] = [
  // ── Day 1  Sun ──────────────────────────────────────────────────────────
  { day:  1, worker: 'אילה',        reg: 6,    shab: 0,    sup: 0,   tip: 6,   expected: 240     },
  { day:  1, worker: 'חיים',        reg: 6.25, shab: 0,    sup: 0,   tip: 56,  expected: 250     },
  { day:  1, worker: 'ליאב',        reg: 6,    shab: 0,    sup: 0,   tip: 78,  expected: 270     },

  // ── Day 2  Mon ──────────────────────────────────────────────────────────
  { day:  2, worker: 'ענבר',        reg: 6.7,  shab: 0,    sup: 0,   tip: 19,  expected: 301.5   },
  { day:  2, worker: 'אילה',        reg: 6,    shab: 0,    sup: 0,   tip: 50,  expected: 240     },
  { day:  2, worker: 'סופיה',       reg: 5,    shab: 0,    sup: 0,   tip: 46,  expected: 225     },
  { day:  2, worker: 'דפנה',        reg: 5.5,  shab: 0,    sup: 0,   tip: 58,  expected: 220     },

  // ── Day 3  Tue ──────────────────────────────────────────────────────────
  { day:  3, worker: "נועה פ",      reg: 6.25, shab: 0,    sup: 0,   tip: 58,  expected: 281.25  },
  { day:  3, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 40,  expected: 280     },
  { day:  3, worker: "צ'יבוטרו",    reg: 6.5,  shab: 0,    sup: 0,   tip: 101, expected: 296,     note: 'tip above threshold: excess=3.5' },

  // ── Day 4  Wed ──────────────────────────────────────────────────────────
  { day:  4, worker: 'ענבר',        reg: 7.5,  shab: 0,    sup: 0,   tip: 16,  expected: 337.5   },
  { day:  4, worker: "נועה פ",      reg: 5.75, shab: 0,    sup: 0,   tip: 0,   expected: 258.75  },
  { day:  4, worker: 'יותם',        reg: 5.7,  shab: 0,    sup: 0,   tip: 38,  expected: 228     },
  { day:  4, worker: 'רפאל',        reg: 3,    shab: 0,    sup: 0,   tip: 0,   expected: 135     },

  // ── Day 5  Thu ──────────────────────────────────────────────────────────
  { day:  5, worker: 'ענבר',        reg: 6.75, shab: 0,    sup: 0,   tip: 54,  expected: 303.75  },
  { day:  5, worker: 'יותם',        reg: 6.5,  shab: 0,    sup: 0,   tip: 57,  expected: 260     },
  { day:  5, worker: 'דפנה',        reg: 4.75, shab: 0,    sup: 0,   tip: 0,   expected: 190     },
  { day:  5, worker: 'חיים',        reg: 6.25, shab: 0,    sup: 0,   tip: 50,  expected: 250     },
  { day:  5, worker: 'סופיה',       reg: 5.25, shab: 0,    sup: 0,   tip: 0,   expected: 236.25  },
  { day:  5, worker: "נועה פ",      reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },

  // ── Day 6  Fri (hours already split by source) ──────────────────────────
  { day:  6, worker: "ג'וליה",      reg: 6.5,  shab: 0,    sup: 0,   tip: 15,  expected: 260     },
  { day:  6, worker: 'אילה',        reg: 5,    shab: 0,    sup: 0,   tip: 0,   expected: 200     },
  { day:  6, worker: "נועה פ",      reg: 6.5,  shab: 0,    sup: 0,   tip: 0,   expected: 292.5   },
  { day:  6, worker: 'רפאל',        reg: 4,    shab: 2,    sup: 0,   tip: 45,  expected: 282.96  },
  { day:  6, worker: 'דפנה',        reg: 2,    shab: 3,    sup: 0,   tip: 0,   expected: 234.44  },
  { day:  6, worker: 'סופיה',       reg: 0,    shab: 7,    sup: 0,   tip: 100, expected: 360.36  },
  { day:  6, worker: 'שחר',         reg: 0,    shab: 4,    sup: 0,   tip: 39,  expected: 205.92  },

  // ── Day 7  Sat ──────────────────────────────────────────────────────────
  { day:  7, worker: 'ענבר',        reg: 0,    shab: 7,    sup: 0,   tip: 35,  expected: 360.36  },
  { day:  7, worker: 'סופיה',       reg: 3,    shab: 4,    sup: 0,   tip: 64,  expected: 340.92  },
  { day:  7, worker: 'דפנה',        reg: 4,    shab: 2,    sup: 0,   tip: 0,   expected: 262.96  },
  { day:  7, worker: "נועה פ",      reg: 3.7,  shab: 2,    sup: 0,   tip: 0,   expected: 269.46  },
  { day:  7, worker: 'חיים',        reg: 5.75, shab: 0,    sup: 0,   tip: 48,  expected: 230     },

  // ── Day 8  Sun ──────────────────────────────────────────────────────────
  { day:  8, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 45,  expected: 280     },
  { day:  8, worker: 'שחר',         reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day:  8, worker: 'אילה',        reg: 7,    shab: 0,    sup: 0,   tip: 0,   expected: 280     },
  { day:  8, worker: 'ליאב',        reg: 6.5,  shab: 0,    sup: 0,   tip: 0,   expected: 292.5   },
  { day:  8, worker: 'דפנה',        reg: 8,    shab: 0,    sup: 0,   tip: 23,  expected: 320     },

  // ── Day 9  Mon ──────────────────────────────────────────────────────────
  { day:  9, worker: 'ענבר',        reg: 6.5,  shab: 0,    sup: 0,   tip: 19,  expected: 292.5   },
  { day:  9, worker: 'ליאב',        reg: 8,    shab: 0,    sup: 0,   tip: 86,  expected: 360     },
  { day:  9, worker: "נועה פ",      reg: 6.6,  shab: 0,    sup: 0,   tip: 86,  expected: 297     },
  { day:  9, worker: 'חיים',        reg: 6.25, shab: 0,    sup: 0,   tip: 95,  expected: 251.25,  note: 'tip above threshold: excess=1.25' },

  // ── Day 10 Tue ──────────────────────────────────────────────────────────
  { day: 10, worker: 'אילה',        reg: 7,    shab: 0,    sup: 0,   tip: 14,  expected: 280     },
  { day: 10, worker: "נועה פ",      reg: 6.25, shab: 0,    sup: 0,   tip: 0,   expected: 281.25  },
  { day: 10, worker: 'חיים',        reg: 6,    shab: 0,    sup: 0,   tip: 27,  expected: 240     },
  { day: 10, worker: 'רפאל',        reg: 6,    shab: 0,    sup: 0,   tip: 90,  expected: 270     },

  // ── Day 11 Wed ──────────────────────────────────────────────────────────
  { day: 11, worker: 'ענבר',        reg: 6.75, shab: 0,    sup: 0,   tip: 15,  expected: 303.75  },
  { day: 11, worker: 'ליאב',        reg: 4.5,  shab: 0,    sup: 0,   tip: 0,   expected: 202.5   },
  { day: 11, worker: 'יותם',        reg: 6.33, shab: 0,    sup: 0,   tip: 40,  expected: 253.2   },
  { day: 11, worker: 'סיני',        reg: 7.5,  shab: 0,    sup: 0,   tip: 0,   expected: 337.5   },
  { day: 11, worker: 'חיים',        reg: 5.25, shab: 0,    sup: 0,   tip: 10,  expected: 210     },

  // ── Day 12 Thu ──────────────────────────────────────────────────────────
  { day: 12, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 37,  expected: 280     },
  { day: 12, worker: 'ליאב',        reg: 5.5,  shab: 0,    sup: 0,   tip: 0,   expected: 247.5   },
  { day: 12, worker: 'יותם',        reg: 6.25, shab: 0,    sup: 0,   tip: 53,  expected: 250     },
  { day: 12, worker: 'סופיה',       reg: 7.5,  shab: 0,    sup: 0,   tip: 0,   expected: 337.5   },
  { day: 12, worker: 'סיני',        reg: 7,    shab: 0,    sup: 0,   tip: 60,  expected: 315     },
  { day: 12, worker: 'רפאל',        reg: 7,    shab: 0,    sup: 0,   tip: 78,  expected: 315     },

  // ── Day 13 Fri ──────────────────────────────────────────────────────────
  { day: 13, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 0,   expected: 280     },
  { day: 13, worker: "נועה פ",      reg: 7.2,  shab: 0,    sup: 0,   tip: 0,   expected: 324     },
  { day: 13, worker: 'אילה',        reg: 5.5,  shab: 0,    sup: 0,   tip: 0,   expected: 220     },
  { day: 13, worker: 'שחר',         reg: 1,    shab: 0,    sup: 0,   tip: 0,   expected: 45      },
  { day: 13, worker: 'רפאל',        reg: 4,    shab: 2,    sup: 0,   tip: 28,  expected: 282.96  },
  { day: 13, worker: 'סופיה',       reg: 3,    shab: 4.25, sup: 0,   tip: 0,   expected: 353.79  },
  { day: 13, worker: 'סיני',        reg: 0,    shab: 8,    sup: 0,   tip: 0,   expected: 411.84  },
  { day: 13, worker: 'חיים',        reg: 0,    shab: 5.25, sup: 0,   tip: 74,  expected: 270.27  },

  // ── Day 14 Sat ──────────────────────────────────────────────────────────
  { day: 14, worker: "נועה פ",      reg: 0,    shab: 5.5,  sup: 0,   tip: 0,   expected: 283.14  },
  { day: 14, worker: 'ענבר',        reg: 0,    shab: 6.75, sup: 0,   tip: 52,  expected: 347.49  },
  { day: 14, worker: 'ליאב',        reg: 0,    shab: 7,    sup: 0,   tip: 0,   expected: 360.36  },
  { day: 14, worker: "ג'וליה",      reg: 0,    shab: 0,    sup: 5.5, tip: 0,   expected: 275,     note: 'support shift ₪50/hr' },
  { day: 14, worker: 'אילה',        reg: 1,    shab: 5,    sup: 0,   tip: 56,  expected: 297.4   },
  { day: 14, worker: 'סיני',        reg: 2,    shab: 4,    sup: 0,   tip: 0,   expected: 295.92  },
  { day: 14, worker: 'רפאל',        reg: 4,    shab: 4,    sup: 0,   tip: 0,   expected: 385.92  },
  { day: 14, worker: 'סופיה',       reg: 6.25, shab: 0,    sup: 0,   tip: 84,  expected: 281.25  },

  // ── Day 15 Sun ──────────────────────────────────────────────────────────
  { day: 15, worker: 'חיים',        reg: 6.5,  shab: 0,    sup: 0,   tip: 10,  expected: 260     },
  { day: 15, worker: 'שחר',         reg: 1,    shab: 0,    sup: 0,   tip: 0,   expected: 45      },
  { day: 15, worker: "נועה פ",      reg: 5,    shab: 0,    sup: 0,   tip: 0,   expected: 225     },
  { day: 15, worker: 'אילה',        reg: 6,    shab: 0,    sup: 0,   tip: 22,  expected: 240     },
  { day: 15, worker: 'ליאב',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 15, worker: 'סיני',        reg: 6,    shab: 0,    sup: 0,   tip: 47,  expected: 270     },

  // ── Day 16 Mon ──────────────────────────────────────────────────────────
  { day: 16, worker: 'חיים',        reg: 6.75, shab: 0,    sup: 0,   tip: 7,   expected: 270     },
  { day: 16, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 16, worker: 'יותם',        reg: 6.25, shab: 0,    sup: 0,   tip: 32,  expected: 250     },
  { day: 16, worker: 'סיני',        reg: 5,    shab: 0,    sup: 0,   tip: 0,   expected: 225     },
  { day: 16, worker: 'רפאל',        reg: 6,    shab: 0,    sup: 0,   tip: 62,  expected: 270     },

  // ── Day 17 Tue ──────────────────────────────────────────────────────────
  { day: 17, worker: 'ענבר',        reg: 6.5,  shab: 0,    sup: 0,   tip: 32,  expected: 292.5   },
  { day: 17, worker: 'דפנה',        reg: 5.5,  shab: 0,    sup: 0,   tip: 0,   expected: 220     },
  { day: 17, worker: 'יותם',        reg: 6.5,  shab: 0,    sup: 0,   tip: 0,   expected: 260     },
  { day: 17, worker: 'אילה',        reg: 6.5,  shab: 0,    sup: 0,   tip: 21,  expected: 260     },
  { day: 17, worker: 'ליאב',        reg: 5.5,  shab: 0,    sup: 0,   tip: 0,   expected: 247.5   },
  { day: 17, worker: 'סופיה',       reg: 7,    shab: 0,    sup: 0,   tip: 48,  expected: 315     },
  { day: 17, worker: 'סיני',        reg: 1,    shab: 0,    sup: 0,   tip: 0,   expected: 45      },

  // ── Day 18 Wed ──────────────────────────────────────────────────────────
  { day: 18, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 40,  expected: 280     },
  { day: 18, worker: 'ענבר',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 18, worker: 'רפאל',        reg: 6,    shab: 0,    sup: 0,   tip: 24,  expected: 270     },
  { day: 18, worker: 'סופיה',       reg: 3,    shab: 0,    sup: 0,   tip: 0,   expected: 135     },
  { day: 18, worker: 'חיים',        reg: 6.25, shab: 0,    sup: 0,   tip: 10,  expected: 250     },

  // ── Day 19 Thu ──────────────────────────────────────────────────────────
  { day: 19, worker: "ג'וליה",      reg: 7,    shab: 0,    sup: 0,   tip: 10,  expected: 280     },
  { day: 19, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 19, worker: 'יותם',        reg: 6.25, shab: 0,    sup: 0,   tip: 0,   expected: 250     },
  { day: 19, worker: "נועה פ",      reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 19, worker: 'סיני',        reg: 7,    shab: 0,    sup: 0,   tip: 0,   expected: 315     },

  // ── Day 20 Fri ──────────────────────────────────────────────────────────
  { day: 20, worker: 'ליאב',        reg: 8.5,  shab: 0,    sup: 0,   tip: 14,  expected: 382.5   },
  { day: 20, worker: 'אילה',        reg: 5,    shab: 0,    sup: 0,   tip: 0,   expected: 200     },
  { day: 20, worker: "נועה פ",      reg: 8.25, shab: 0,    sup: 0,   tip: 0,   expected: 371.25  },
  { day: 20, worker: 'רפאל',        reg: 3,    shab: 2,    sup: 0,   tip: 38,  expected: 237.96  },
  { day: 20, worker: 'שחר',         reg: 0,    shab: 7,    sup: 0,   tip: 19,  expected: 360.36  },
  { day: 20, worker: "צ'יבוטרו",    reg: 0,    shab: 9,    sup: 0,   tip: 0,   expected: 463.32  },

  // ── Day 21 Sat ──────────────────────────────────────────────────────────
  { day: 21, worker: "ג'וליה",      reg: 0,    shab: 4.5,  sup: 0,   tip: 0,   expected: 231.66  },
  { day: 21, worker: 'ענבר',        reg: 0,    shab: 7.5,  sup: 0,   tip: 95,  expected: 386.1   },
  { day: 21, worker: 'סופיה',       reg: 0,    shab: 6,    sup: 0,   tip: 0,   expected: 308.88  },
  { day: 21, worker: 'ליאב',        reg: 0,    shab: 6,    sup: 0,   tip: 0,   expected: 308.88  },
  { day: 21, worker: "נועה פ",      reg: 0,    shab: 5.5,  sup: 0,   tip: 0,   expected: 283.14  },
  { day: 21, worker: 'סיני',        reg: 5.5,  shab: 0,    sup: 0,   tip: 66,  expected: 247.5   },

  // ── Day 22 Sun ──────────────────────────────────────────────────────────
  { day: 22, worker: 'אילה',        reg: 6.5,  shab: 0,    sup: 0,   tip: 20,  expected: 260     },
  { day: 22, worker: 'ליאב',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 22, worker: 'סיני',        reg: 6.5,  shab: 0,    sup: 0,   tip: 47,  expected: 292.5   },
  { day: 22, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 22, worker: 'סופיה',       reg: 7.25, shab: 0,    sup: 0,   tip: 50,  expected: 326.25  },

  // ── Day 23 Mon ──────────────────────────────────────────────────────────
  { day: 23, worker: 'ענבר',        reg: 6.5,  shab: 0,    sup: 0,   tip: 5,   expected: 292.5   },
  { day: 23, worker: 'סיני',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 23, worker: 'יותם',        reg: 6.25, shab: 0,    sup: 0,   tip: 16,  expected: 250     },
  { day: 23, worker: 'סופיה',       reg: 7,    shab: 0,    sup: 0,   tip: 0,   expected: 315     },
  { day: 23, worker: 'ליאב',        reg: 6.7,  shab: 0,    sup: 0,   tip: 8,   expected: 301.5   },

  // ── Day 24 Tue ──────────────────────────────────────────────────────────
  { day: 24, worker: 'ענבר',        reg: 6.5,  shab: 0,    sup: 0,   tip: 42,  expected: 292.5   },
  { day: 24, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 24, worker: 'יותם',        reg: 6.5,  shab: 0,    sup: 0,   tip: 49,  expected: 260     },
  { day: 24, worker: 'ליאב',        reg: 4,    shab: 0,    sup: 0,   tip: 0,   expected: 180     },
  { day: 24, worker: 'רפאל',        reg: 7.5,  shab: 0,    sup: 0,   tip: 25,  expected: 337.5   },

  // ── Day 25 Wed ──────────────────────────────────────────────────────────
  { day: 25, worker: 'ליאב',        reg: 4,    shab: 0,    sup: 0,   tip: 0,   expected: 180     },
  { day: 25, worker: 'סופיה',       reg: 4,    shab: 0,    sup: 0,   tip: 34,  expected: 180     },
  { day: 25, worker: 'יותם',        reg: 6.3,  shab: 0,    sup: 0,   tip: 13,  expected: 252     },
  { day: 25, worker: 'שחר',         reg: 8,    shab: 0,    sup: 0,   tip: 0,   expected: 360     },
  { day: 25, worker: 'חיים',        reg: 6,    shab: 0,    sup: 0,   tip: 6,   expected: 240     },

  // ── Day 26 Thu ──────────────────────────────────────────────────────────
  { day: 26, worker: "ג'וליה",      reg: 6.5,  shab: 0,    sup: 0,   tip: 18,  expected: 260     },
  { day: 26, worker: 'ענבר',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 26, worker: 'אילה',        reg: 6,    shab: 0,    sup: 0,   tip: 10,  expected: 240     },
  { day: 26, worker: 'רפאל',        reg: 6.75, shab: 0,    sup: 0,   tip: 79,  expected: 303.75  },
  { day: 26, worker: 'סיני',        reg: 6.75, shab: 0,    sup: 0,   tip: 60,  expected: 303.75  },

  // ── Day 27 Fri (tips in source sum to 115, day total is 161 — incomplete source data) ──
  { day: 27, worker: "ג'וליה",      reg: 7.5,  shab: 0,    sup: 0,   tip: 32,  expected: 300     },
  { day: 27, worker: 'שחר',         reg: 8,    shab: 0,    sup: 0,   tip: 0,   expected: 360     },
  { day: 27, worker: 'אילה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 27, worker: 'סופיה',       reg: 5.75, shab: 0,    sup: 0,   tip: 0,   expected: 258.75  },
  { day: 27, worker: 'ליאב',        reg: 4,    shab: 2.3,  sup: 0,   tip: 38,  expected: 298.404 },
  { day: 27, worker: 'סיני',        reg: 0,    shab: 6,    sup: 0,   tip: 45,  expected: 308.88  },
  { day: 27, worker: 'סופיה',       reg: 0,    shab: 8,    sup: 0,   tip: 0,   expected: 411.84,  note: 'סופיה second shift same day (evening)' },

  // ── Day 28 Sat ──────────────────────────────────────────────────────────
  { day: 28, worker: 'ענבר',        reg: 0,    shab: 6.5,  sup: 0,   tip: 46,  expected: 334.62  },
  { day: 28, worker: 'דפנה',        reg: 0,    shab: 6,    sup: 0,   tip: 0,   expected: 308.88  },
  { day: 28, worker: 'אילה',        reg: 0,    shab: 8,    sup: 0,   tip: 0,   expected: 411.84  },
  { day: 28, worker: "ג'וליה",      reg: 0,    shab: 0,    sup: 7,   tip: 0,   expected: 350,     note: 'support shift ₪50/hr' },
  { day: 28, worker: 'סופיה',       reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 270     },
  { day: 28, worker: 'רפאל',        reg: 1,    shab: 5,    sup: 0,   tip: 76,  expected: 302.4   },
  { day: 28, worker: 'שחר',         reg: 4,    shab: 0,    sup: 0,   tip: 0,   expected: 180     },
  { day: 28, worker: 'ליאב',        reg: 7,    shab: 0,    sup: 0,   tip: 65,  expected: 315     },

  // ── Day 29 Sun ──────────────────────────────────────────────────────────
  { day: 29, worker: 'אילה',        reg: 7,    shab: 0,    sup: 0,   tip: 36,  expected: 280     },
  { day: 29, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 29, worker: 'ליאב',        reg: 6,    shab: 0,    sup: 0,   tip: 33,  expected: 270     },
  { day: 29, worker: 'סיני',        reg: 4.5,  shab: 0,    sup: 0,   tip: 0,   expected: 202.5   },
  { day: 29, worker: 'רפאל',        reg: 7,    shab: 0,    sup: 0,   tip: 7,   expected: 315     },

  // ── Day 30 Mon ──────────────────────────────────────────────────────────
  { day: 30, worker: 'ענבר',        reg: 6.5,  shab: 0,    sup: 0,   tip: 0,   expected: 292.5   },
  { day: 30, worker: 'דפנה',        reg: 6,    shab: 0,    sup: 0,   tip: 0,   expected: 240     },
  { day: 30, worker: 'סיני',        reg: 6.5,  shab: 0,    sup: 0,   tip: 66,  expected: 292.5   },
  { day: 30, worker: 'יותם',        reg: 6.5,  shab: 0,    sup: 0,   tip: 0,   expected: 260     },
  { day: 30, worker: 'רפאל',        reg: 7,    shab: 0,    sup: 0,   tip: 68,  expected: 315     },

  // ── Day 31 Tue ──────────────────────────────────────────────────────────
  { day: 31, worker: 'ליאב',        reg: 6.5,  shab: 0,    sup: 0,   tip: 4,   expected: 292.5   },
  { day: 31, worker: "צ'יבוטרו",    reg: 2.5,  shab: 0,    sup: 0,   tip: 0,   expected: 112.5   },
  { day: 31, worker: 'יותם',        reg: 6.5,  shab: 0,    sup: 0,   tip: 24,  expected: 260     },
  { day: 31, worker: 'סיני',        reg: 5.5,  shab: 0,    sup: 0,   tip: 0,   expected: 247.5   },
  { day: 31, worker: 'רפאל',        reg: 8,    shab: 0,    sup: 0,   tip: 97,  expected: 360     },
]

describe('Real data — March 2026 salary formula (136 shifts)', () => {
  it.each(DATA)(
    'Day $day $worker: $reg reg + $shab shab + $sup sup + tip $tip → ₪$expected',
    ({ worker, reg, shab, sup, tip, expected }) => {
      const wage = W[worker]
      expect(wage, `Unknown worker "${worker}" — add wage to W`).toBeDefined()
      const result = calcSalary(reg, shab, sup, tip, wage)
      expect(result).toBeCloseTo(expected, 1)
    }
  )
})
