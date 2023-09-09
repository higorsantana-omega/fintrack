import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthenticationConstants } from '../../constants/AuthenticationConstats'
import { SignupParams, authService } from '../../../app/services/authService'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../../app/hooks/useAuth'

const schema = z.object({
  name: z.string().nonempty(AuthenticationConstants.NAME_REQUIRED),
  email: z.string().nonempty(AuthenticationConstants.EMAIL_REQUIRED).email(),
  password: z.string().nonempty(AuthenticationConstants.PASSWORD_REQUIRED).min(8, AuthenticationConstants.PASSWORD_MIN_LENGTH)
})

type FormData = z.infer<typeof schema>

export function useRegisterController () {
  const {
    handleSubmit: hookFormSubmit,
    register,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const { isLoading, mutateAsync } = useMutation({
    mutationFn: async (data: SignupParams) => {
      return authService.signup(data)
    }
  })

  const { signin } = useAuth()

  const handleSubmit = hookFormSubmit(async data => {
    try {
      const { accessToken } = await mutateAsync(data)
      signin(accessToken)
    } catch (error) {
      toast.error('Ocorreu um erro ao criar sua conta')
    }
  })

  return { register, errors, handleSubmit, isLoading }
}