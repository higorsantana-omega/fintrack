import { useContext } from 'react'
import { GoalsContext } from '.'

export function useGoalsPage() {
  return useContext(GoalsContext)
}
