import { DateTime } from 'luxon'

type PrivateUseInput = {
  timezone: string
  operatingHoursStart: string
  operatingHoursEnd: string
  speedKph: number
  ts: string
}

export function detectPrivateUse(input: PrivateUseInput): boolean {
  if (input.speedKph <= 5) {
    return false
  }

  const local = DateTime.fromISO(input.ts, { zone: input.timezone })
  const [startHour, startMinute] = input.operatingHoursStart
    .split(':')
    .map(Number)
  const [endHour, endMinute] = input.operatingHoursEnd.split(':').map(Number)

  const start = local.set({
    hour: startHour ?? 6,
    minute: startMinute ?? 0,
    second: 0,
    millisecond: 0,
  })
  const end = local.set({
    hour: endHour ?? 22,
    minute: endMinute ?? 0,
    second: 0,
    millisecond: 0,
  })

  return local < start || local > end
}
