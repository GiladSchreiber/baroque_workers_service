import type { Shift, CreateShiftInput } from '../../types'
import type { ShiftRepository } from '../interfaces/ShiftRepository'
import { LocalStore } from './LocalStore'

const SEED_VERSION = 'v3'
const SEED_VERSION_KEY = 'baroque_shifts_seed_v'

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Add `h` hours (may be fractional) to a HH:mm start time, return HH:mm. */
function addHours(start: string, h: number): string {
  const [sh, sm] = start.split(':').map(Number)
  const total = sh * 60 + sm + Math.round(h * 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Seed data — April 2026
//
// Naming convention for shift ids: shift-<date>-<empId>[-b] (b = second shift)
//
// Time rules applied:
//   • Weekday / Passover holiday (days 1,2,7,8): type='regular', start=09:00,
//     total hours = regular + shabbat (holiday rate not supported yet).
//   • Friday (days 3,10): start=09:00, total = regular + shabbat hours.
//     splitShiftHours() will auto-split at 14:00.
//     Exception: workers with ONLY shabbat hours on Friday → start=14:00.
//   • Saturday (days 4,11): start=11:00, total = shabbat + regular hours.
//     splitShiftHours() will auto-split at 20:00.
//   • Support-only shifts: start=09:00, type='support'.
//   • רפאל day 14: TWO shifts — one regular 6h, one support 5.5h.
// ---------------------------------------------------------------------------

const SEED: Shift[] = [
  // ── Day 1 · Wed April 1 (Passover holiday) ─────────────────────────────
  {
    id: 'shift-20260401-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-01',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 9.5), // 9.5 regular + 0 shabbat
    tips: 91,
    revenue: 6969, cash: 2127, credit: 4939,
    submittedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'shift-20260401-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-01',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5 + 1), // 6.5 regular + 1 shabbat = 7.5h
    tips: 5,
    submittedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'shift-20260401-emp-uri',
    employeeId: 'emp-uri',
    date: '2026-04-01',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 8), // 0 regular + 8 shabbat = 8h
    tips: 0,
    submittedAt: '2026-04-01T10:00:00.000Z',
  },

  // ── Day 2 · Thu April 2 (Passover holiday) ─────────────────────────────
  {
    id: 'shift-20260402-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-02',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 7), // 0 regular + 7 shabbat = 7h
    tips: 93,
    submittedAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'shift-20260402-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-02',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 6.6), // 0 regular + 6.6 shabbat = 6.6h
    tips: 90,
    submittedAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'shift-20260402-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-02',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 10), // 0 regular + 10 shabbat = 10h
    tips: 0,
    revenue: 12725, cash: 1821, credit: 11192,
    submittedAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'shift-20260402-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-02',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5 + 1), // 6.5 regular + 1 shabbat = 7.5h
    tips: 65,
    submittedAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'shift-20260402-emp-uri',
    employeeId: 'emp-uri',
    date: '2026-04-02',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5 + 1), // 6.5 regular + 1 shabbat = 7.5h
    tips: 60,
    submittedAt: '2026-04-02T10:00:00.000Z',
  },

  // ── Day 3 · Fri April 3 ────────────────────────────────────────────────
  // Workers with ONLY shabbat hours start at 14:00.
  // Workers with regular hours (or mixed) start at 09:00; total = reg + shabbat.
  // splitShiftHours() will split at 14:00 automatically.
  {
    id: 'shift-20260403-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-03',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7 + 0), // 7h regular, all before 14:00
    tips: 35,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-03',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5 + 0), // 6.5h regular
    tips: 0,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-03',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 5.5 + 0), // 5.5h regular
    tips: 0,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-03',
    type: 'support',
    startTime: '09:00',
    endTime: addHours('09:00', 6), // 6h support
    tips: 30,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-03',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 5 + 1), // 5 regular + 1 shabbat = 6h total
    tips: 66,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-03',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 4 + 4), // 4 regular + 4 shabbat = 8h total
    tips: 60,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-03',
    type: 'regular',
    startTime: '14:00', // only shabbat hours — starts at candle-lighting
    endTime: addHours('14:00', 5), // 5h shabbat
    tips: 60,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },
  {
    id: 'shift-20260403-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-03',
    type: 'regular',
    startTime: '14:00', // only shabbat hours
    endTime: addHours('14:00', 7), // 7h shabbat
    tips: 60,
    revenue: 13013, cash: 2104, credit: 11238,
    submittedAt: '2026-04-03T10:00:00.000Z',
  },

  // ── Day 4 · Sat April 4 ────────────────────────────────────────────────
  // All workers start at 11:00. splitShiftHours() splits at 20:00.
  // Workers with mixed shabbat+regular: total = shabbat + regular.
  {
    id: 'shift-20260404-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 0 + 7), // 7h shabbat
    tips: 65,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 6.25), // 6.25h shabbat
    tips: 0,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 7.5), // 7.5h shabbat
    tips: 0,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 3), // 3h shabbat
    tips: 0,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 6), // 6h shabbat
    tips: 82,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 7.5), // 7.5h shabbat
    tips: 0,
    revenue: 15064, cash: 3119, credit: 12153,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 4.5 + 1), // 4.5h shabbat + 1h regular (post-20:00) = 5.5h
    tips: 0,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },
  {
    id: 'shift-20260404-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-04',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 7 + 0), // 7h regular (evening, listed as regular in CSV)
    tips: 61,
    submittedAt: '2026-04-04T10:00:00.000Z',
  },

  // ── Day 5 · Sun April 5 ────────────────────────────────────────────────
  {
    id: 'shift-20260405-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.75),
    tips: 60,
    revenue: 12483, cash: 3146, credit: 9577,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 0,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 72,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 1),
    tips: 0,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 4),
    tips: 0,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-dafna',
    employeeId: 'emp-dafna',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 0,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'shift-20260405-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-05',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 108,
    submittedAt: '2026-04-05T10:00:00.000Z',
  },

  // ── Day 6 · Mon April 6 ────────────────────────────────────────────────
  {
    id: 'shift-20260406-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 0,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    id: 'shift-20260406-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 4),
    tips: 0,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    id: 'shift-20260406-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 0,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    id: 'shift-20260406-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 0,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    id: 'shift-20260406-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.5),
    tips: 0,
    revenue: 10282, cash: 1825, credit: 8591,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },
  {
    id: 'shift-20260406-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-06',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 41,
    submittedAt: '2026-04-06T10:00:00.000Z',
  },

  // ── Day 7 · Tue April 7 (Passover holiday) ─────────────────────────────
  {
    id: 'shift-20260407-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-07',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 31,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'shift-20260407-emp-uri',
    employeeId: 'emp-uri',
    date: '2026-04-07',
    type: 'support',
    startTime: '09:00',
    endTime: addHours('09:00', 3), // 3h support
    tips: 0,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'shift-20260407-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-07',
    type: 'support',
    startTime: '09:00',
    endTime: addHours('09:00', 2), // 2h support
    tips: 0,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'shift-20260407-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-07',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 5 + 1), // 5 regular + 1 shabbat = 6h (holiday)
    tips: 39,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'shift-20260407-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-07',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 3 + 5), // 3 regular + 5 shabbat = 8h (holiday)
    tips: 0,
    revenue: 9825, cash: 2130, credit: 7881,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'shift-20260407-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-07',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 7.5), // 7.5 shabbat (holiday)
    tips: 100,
    submittedAt: '2026-04-07T10:00:00.000Z',
  },

  // ── Day 8 · Wed April 8 (Passover holiday) ─────────────────────────────
  {
    id: 'shift-20260408-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 7), // 7 shabbat (holiday)
    tips: 42,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 6.25), // 6.25 shabbat (holiday)
    tips: 94,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-uri',
    employeeId: 'emp-uri',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 2), // 2 shabbat (holiday)
    tips: 0,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 4.5 + 3), // 4.5 regular + 3 shabbat = 7.5h (holiday)
    tips: 0,
    revenue: 10426, cash: 1785, credit: 8790,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.75), // 6.75 regular
    tips: 38,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 6), // 6 shabbat (holiday)
    tips: 0,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },
  {
    id: 'shift-20260408-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-08',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 0 + 6.5), // 6.5 shabbat (holiday)
    tips: 0,
    submittedAt: '2026-04-08T10:00:00.000Z',
  },

  // ── Day 9 · Thu April 9 ────────────────────────────────────────────────
  {
    id: 'shift-20260409-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-09',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 43,
    submittedAt: '2026-04-09T10:00:00.000Z',
  },
  {
    id: 'shift-20260409-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-09',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 91,
    submittedAt: '2026-04-09T10:00:00.000Z',
  },
  {
    id: 'shift-20260409-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-09',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.5),
    tips: 0,
    submittedAt: '2026-04-09T10:00:00.000Z',
  },
  {
    id: 'shift-20260409-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-09',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.5),
    tips: 43,
    submittedAt: '2026-04-09T10:00:00.000Z',
  },
  {
    id: 'shift-20260409-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-09',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.5),
    tips: 0,
    revenue: 8969, cash: 1328, credit: 7819,
    submittedAt: '2026-04-09T10:00:00.000Z',
  },

  // ── Day 10 · Fri April 10 ──────────────────────────────────────────────
  // Same rules as day 3: mixed → 09:00 + total; shabbat-only → 14:00 + hours.
  {
    id: 'shift-20260410-emp-julia',
    employeeId: 'emp-julia',
    date: '2026-04-10',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7 + 0), // 7 regular
    tips: 44,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-dafna',
    employeeId: 'emp-dafna',
    date: '2026-04-10',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5 + 0), // 6.5 regular
    tips: 0,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-10',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7 + 0), // 7 regular
    tips: 0,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-10',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6 + 0), // 6 regular
    tips: 62,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-10',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 3 + 4), // 3 regular + 4 shabbat = 7h total
    tips: 50,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-10',
    type: 'regular',
    startTime: '14:00', // shabbat-only
    endTime: addHours('14:00', 4), // 4h shabbat
    tips: 0,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'shift-20260410-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-10',
    type: 'regular',
    startTime: '14:00', // shabbat-only
    endTime: addHours('14:00', 8.5), // 8.5h shabbat
    tips: 24,
    revenue: 9345, cash: 1837, credit: 7688,
    submittedAt: '2026-04-10T10:00:00.000Z',
  },

  // ── Day 11 · Sat April 11 ──────────────────────────────────────────────
  // All workers start at 11:00. splitShiftHours() splits at 20:00.
  {
    id: 'shift-20260411-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 6.75), // 6.75 shabbat
    tips: 51,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 7), // 7 shabbat
    tips: 0,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 5.5), // 5.5 shabbat
    tips: 0,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 6), // 6 shabbat
    tips: 0,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 5.5 + 0.5), // 5.5 shabbat + 0.5 regular = 6h total
    tips: 0,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 5 + 1.5), // 5 shabbat + 1.5 regular = 6.5h total
    tips: 57,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-rafael',
    employeeId: 'emp-rafael',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 2 + 4.5), // 2 shabbat + 4.5 regular = 6.5h total
    tips: 0,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'shift-20260411-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-11',
    type: 'regular',
    startTime: '11:00',
    endTime: addHours('11:00', 0 + 7.75), // 7.75 regular (evening)
    tips: 89,
    revenue: 13615, cash: 2556, credit: 11257,
    submittedAt: '2026-04-11T10:00:00.000Z',
  },

  // ── Day 12 · Sun April 12 ──────────────────────────────────────────────
  {
    id: 'shift-20260412-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-12',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 37,
    submittedAt: '2026-04-12T10:00:00.000Z',
  },
  {
    id: 'shift-20260412-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-12',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 49,
    submittedAt: '2026-04-12T10:00:00.000Z',
  },
  {
    id: 'shift-20260412-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-12',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 9),
    tips: 0,
    revenue: 5511, cash: 1227, credit: 4409,
    submittedAt: '2026-04-12T10:00:00.000Z',
  },
  {
    id: 'shift-20260412-emp-nea',
    employeeId: 'emp-nea',
    date: '2026-04-12',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 5.5),
    tips: 49,
    submittedAt: '2026-04-12T10:00:00.000Z',
  },

  // ── Day 13 · Mon April 13 ──────────────────────────────────────────────
  {
    id: 'shift-20260413-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-13',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.75),
    tips: 16,
    submittedAt: '2026-04-13T10:00:00.000Z',
  },
  {
    id: 'shift-20260413-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-13',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 8),
    tips: 27,
    revenue: 3238, cash: 950, credit: 2331,
    submittedAt: '2026-04-13T10:00:00.000Z',
  },
  {
    id: 'shift-20260413-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-13',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 3),
    tips: 0,
    submittedAt: '2026-04-13T10:00:00.000Z',
  },
  {
    id: 'shift-20260413-emp-uri',
    employeeId: 'emp-uri',
    date: '2026-04-13',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 3),
    tips: 0,
    submittedAt: '2026-04-13T10:00:00.000Z',
  },
  {
    id: 'shift-20260413-emp-sinai',
    employeeId: 'emp-sinai',
    date: '2026-04-13',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 3),
    tips: 0,
    submittedAt: '2026-04-13T10:00:00.000Z',
  },

  // ── Day 14 · Tue April 14 ──────────────────────────────────────────────
  // רפאל has BOTH 6h regular AND 5.5h support → two separate shifts.
  {
    id: 'shift-20260414-emp-inbar',
    employeeId: 'emp-inbar',
    date: '2026-04-14',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 27,
    submittedAt: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'shift-20260414-emp-rafael-a',
    employeeId: 'emp-rafael',
    date: '2026-04-14',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6), // regular portion
    tips: 33,
    submittedAt: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'shift-20260414-emp-rafael-b',
    employeeId: 'emp-rafael',
    date: '2026-04-14',
    type: 'support',
    startTime: '09:00',
    endTime: addHours('09:00', 5.5), // support portion
    submittedAt: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'shift-20260414-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-14',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 0,
    submittedAt: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'shift-20260414-emp-dafna',
    employeeId: 'emp-dafna',
    date: '2026-04-14',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 0,
    submittedAt: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'shift-20260414-emp-liav',
    employeeId: 'emp-liav',
    date: '2026-04-14',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6.5),
    tips: 28,
    revenue: 6721, cash: 1688, credit: 5121,
    submittedAt: '2026-04-14T10:00:00.000Z',
  },

  // ── Day 15 · Wed April 15 ──────────────────────────────────────────────
  {
    id: 'shift-20260415-emp-sofia',
    employeeId: 'emp-sofia',
    date: '2026-04-15',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 38,
    submittedAt: '2026-04-15T10:00:00.000Z',
  },
  {
    id: 'shift-20260415-emp-ila',
    employeeId: 'emp-ila',
    date: '2026-04-15',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 6),
    tips: 0,
    submittedAt: '2026-04-15T10:00:00.000Z',
  },
  {
    id: 'shift-20260415-emp-yotam',
    employeeId: 'emp-yotam',
    date: '2026-04-15',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7.5),
    tips: 91,
    revenue: 6226, cash: 1721, credit: 4664,
    submittedAt: '2026-04-15T10:00:00.000Z',
  },
  {
    id: 'shift-20260415-emp-shahar',
    employeeId: 'emp-shahar',
    date: '2026-04-15',
    type: 'regular',
    startTime: '09:00',
    endTime: addHours('09:00', 7),
    tips: 29,
    submittedAt: '2026-04-15T10:00:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Version guard — clears stale data and re-seeds on version bump
// ---------------------------------------------------------------------------

function getStore(): LocalStore<Shift> {
  if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    localStorage.removeItem('shifts')
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
  }
  return new LocalStore<Shift>('shifts', SEED)
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class MockShiftRepository implements ShiftRepository {
  private store = getStore()

  async getAll() { return this.store.getAll() }
  async getByEmployee(employeeId: string) {
    return this.store.getAll().filter(s => s.employeeId === employeeId)
  }
  async getByDateRange(start: string, end: string) {
    return this.store.getAll().filter(s => s.date >= start && s.date <= end)
  }
  async create(data: CreateShiftInput) {
    return this.store.create({
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    })
  }
  async update(id: string, data: Partial<Shift>) {
    return this.store.update(id, { ...data, updatedAt: new Date().toISOString() })
  }
  async delete(id: string) { this.store.delete(id) }
}
