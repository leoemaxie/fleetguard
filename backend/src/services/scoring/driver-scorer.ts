type TripLike = {
  complianceScore: string | null
  totalDistanceKm: string | null
  totalFuelUsedLitres: string | null
}

type AlertLike = {
  severity: 'critical' | 'warning' | 'info'
}

export type DriverScore = {
  totalScore: number
  routeComplianceScore: number
  fuelScore: number
  alertScore: number
  stopScore: number
}

export function computeDriverWeeklyScore(
  trips: TripLike[],
  alerts: AlertLike[],
): DriverScore {
  const routeCompliancePct =
    trips.length === 0
      ? 100
      : trips.reduce(
          (sum, trip) => sum + Number(trip.complianceScore ?? 100),
          0,
        ) / trips.length
  const routeComplianceScore = Math.round((routeCompliancePct / 100) * 40)

  const distance = trips.reduce(
    (sum, trip) => sum + Number(trip.totalDistanceKm ?? 0),
    0,
  )
  const actualFuel = trips.reduce(
    (sum, trip) => sum + Number(trip.totalFuelUsedLitres ?? 0),
    0,
  )
  const expectedFuel = distance * 0.18
  const overRatio =
    expectedFuel === 0
      ? 0
      : Math.max(0, (actualFuel - expectedFuel) / expectedFuel)
  const fuelPenalty = Math.floor((overRatio * 100) / 10) * 3
  const fuelScore = Math.max(0, 30 - fuelPenalty)

  const criticalCount = alerts.filter(
    alert => alert.severity === 'critical',
  ).length
  const warningCount = alerts.filter(
    alert => alert.severity === 'warning',
  ).length
  const alertScore = Math.max(0, 20 - criticalCount * 5 - warningCount * 2)

  const stopScore = 10

  return {
    totalScore: Math.max(
      0,
      Math.min(100, routeComplianceScore + fuelScore + alertScore + stopScore),
    ),
    routeComplianceScore,
    fuelScore,
    alertScore,
    stopScore,
  }
}
