import { User } from '../entities/User'
import { httpClient } from './httpClient'

type MeResponse = User

async function me() {
  const { data } = await httpClient.get<MeResponse>('/users/me')
  return data
}

export const usersService = {
  me
}