import { Link } from "react-router-dom";
import { Input } from "../../components/Input";

export function Register () {
  return (
     <>
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-[-0.5px]">Crie sua conta</h1>

        <p className="space-x-2">
          <span className="text-gray-700 tracking-[-0.5px]">Ja possui uma conta?</span>
          <Link to='/login' className="tracking-[-0.5px] font-medium text-teal-900">
            Fazer login
          </Link>
        </p>
      </header>

      <form className="mt-[60px] flex flex-col gap-4">
        <Input type="text" placeholder="Nome" name="name"/>
        <Input type="email" placeholder="E-mail" name="email"/>
        <Input type="password" placeholder="Senha" name="password"/>

        <button type="submit" className="mt-2">Criar conta</button>
      </form>
    </>
  )
}
