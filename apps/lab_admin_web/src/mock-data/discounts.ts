import type { DiscountRule } from './types'

export const discountRules: DiscountRule[] = [
  { id: '1', label: 'Doctor role', percent: 10, appliesTo: 'doctor' },
  { id: '2', label: 'Clinic role', percent: 15, appliesTo: 'clinic' },
  { id: '3', label: 'Patient role', percent: 5, appliesTo: 'patient' },
  { id: '4', label: 'Reception role', percent: 2, appliesTo: 'reception' },
]
