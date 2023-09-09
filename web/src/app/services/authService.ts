import { httpClient } from "./httpClient";

export interface SignupParams {
  name: string
  email: string
  password: string
}

export interface SigninParams {
  email: string
  password: string
}

async function signup(params: SignupParams) {
  const { data } = await httpClient.post<{ accessToken: string}>('/auth/signup', params)
  return data
}

async function signin(params: SigninParams) {
  const { data } = await httpClient.post<{ accessToken: string}>('/auth/signin', params)
  return data
}

export const authService = {
  signup,
  signin
}