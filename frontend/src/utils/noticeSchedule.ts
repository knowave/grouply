const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')

// Date whose UTC fields hold the KST wall-clock time
function kstWall(iso: string): Date | null {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : new Date(t + KST_OFFSET_MS)
}

function wallParts(d: Date) {
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  }
}

export function toScheduledAt(date: string, time: string): string {
  return `${date} ${time}`
}

export function isoToKstParts(iso: string): { date: string; time: string } {
  const d = kstWall(iso)
  return d ? wallParts(d) : { date: '', time: '' }
}

export function formatKst(iso: string | null | undefined): string {
  const d = iso ? kstWall(iso) : null
  if (!d) return '-'
  const { date, time } = wallParts(d)
  return `${date} ${time}`
}

export function effectiveSendLabel(date: string, time: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dm || !tm) return null
  const minutes = Number(tm[1]) * 60 + Number(tm[2])
  const day = new Date(Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3])))
  if (Number.isNaN(day.getTime()) || Number(tm[1]) > 23 || Number(tm[2]) > 59) return null

  const isWeekday = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5
  if (isWeekday(day) && minutes >= 8 * 60 && minutes <= 19 * 60) return null

  let send = day
  if (!(isWeekday(day) && minutes < 8 * 60)) {
    do send = new Date(send.getTime() + DAY_MS)
    while (!isWeekday(send))
  }
  return `${pad(send.getUTCMonth() + 1)}/${pad(send.getUTCDate())}(${WEEKDAYS[send.getUTCDay()]}) 08:00`
}
