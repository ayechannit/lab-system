import type { PointsRule, UserPointsRow } from './types'

export const pointsRule: PointsRule = {
  mmkSpend: 100_000,
  pointsEarned: 10,
}

export const userPoints: UserPointsRow[] = [
  { userId: 'u1', name: 'John Doe', role: 'Patient', points: 120 },
  { userId: 'u2', name: 'Mary Su', role: 'Patient', points: 80 },
  { userId: 'u3', name: 'City Clinic', role: 'Clinic', points: 340 },
  { userId: 'u4', name: 'Dr. Aung', role: 'Doctor', points: 55 },
]
