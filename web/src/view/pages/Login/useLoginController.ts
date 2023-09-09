import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthenticationConstants } from "../../constants/AuthenticationConstats";
import { httpClient } from "../../../app/services/httpClient";
import { useMutation } from "@tanstack/react-query";
import { SigninParams, authService } from "../../../app/services/authService";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().nonempty(AuthenticationConstants.EMAIL_REQUIRED).email(),
  password: z.string().nonempty(AuthenticationConstants.PASSWORD_REQUIRED).min(8, AuthenticationConstants.PASSWORD_MIN_LENGTH)
})

type FormData = z.infer<typeof schema>

export function useLoginController () {
  const { 
    handleSubmit: hookFormSubmit,
    register,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const { isLoading, mutateAsync } = useMutation({
    mutationFn: async (data: SigninParams) => {
      return authService.signin(data)
    }
  })

  const handleSubmit = hookFormSubmit(async data => {
    try {
      const { accessToken } = await mutateAsync(data)
      console.log({ accessToken })
    } catch (error) {
      toast.error('Credenciais invalidas')
    }
  })

  return { handleSubmit, register, errors, isLoading }
}
