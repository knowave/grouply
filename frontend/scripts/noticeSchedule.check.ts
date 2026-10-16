import { effectiveSendLabel, formatKst, isoToKstParts, toScheduledAt } from '../src/utils/noticeSchedule.ts'

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}
function eq(actual: unknown, expected: unknown, msg: string) {
  check(actual === expected, `${msg}: expected ${String(expected)}, got ${String(actual)}`)
}

// 2026-10-16 is a Friday
eq(effectiveSendLabel('2026-10-14', '10:00'), null, 'weekday 10:00')
eq(effectiveSendLabel('2026-10-14', '08:00'), null, 'weekday 08:00')
eq(effectiveSendLabel('2026-10-14', '19:00'), null, 'weekday 19:00')
eq(effectiveSendLabel('2026-10-14', '07:59'), '10/14(수) 08:00', 'weekday 07:59')
eq(effectiveSendLabel('2026-10-14', '19:01'), '10/15(목) 08:00', 'weekday 19:01')
eq(effectiveSendLabel('2026-10-16', '20:00'), '10/19(월) 08:00', 'Fri 20:00')
eq(effectiveSendLabel('2026-10-17', '10:00'), '10/19(월) 08:00', 'Sat')
eq(effectiveSendLabel('2026-10-18', '07:00'), '10/19(월) 08:00', 'Sun')
eq(effectiveSendLabel('2026-10-30', '20:00'), '11/02(월) 08:00', 'month boundary')
eq(effectiveSendLabel('', '10:00'), null, 'empty date')
eq(effectiveSendLabel('2026-10-14', ''), null, 'empty time')

eq(toScheduledAt('2026-10-20', '13:50'), '2026-10-20 13:50', 'toScheduledAt')
const plus9 = isoToKstParts('2026-10-20T13:50:00+09:00')
eq(`${plus9.date} ${plus9.time}`, '2026-10-20 13:50', 'iso +09:00')
const z = isoToKstParts('2026-10-20T04:50:00Z')
eq(`${z.date} ${z.time}`, '2026-10-20 13:50', 'iso Z')
eq(isoToKstParts('2026-10-20T20:00:00Z').date, '2026-10-21', 'iso Z day rollover')
eq(formatKst('2026-10-20T04:50:00Z'), '2026-10-20 13:50', 'formatKst')
eq(formatKst(null), '-', 'formatKst null')
eq(formatKst(''), '-', 'formatKst empty')

console.log('noticeSchedule: all checks passed')
