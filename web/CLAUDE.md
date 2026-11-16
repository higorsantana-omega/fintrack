# Fintrack Web — Convenções

Convenções sempre ativas para o frontend (`web/`). Skills específicas (scaffold de feature, modal, cypress) ficam em `~/.claude/skills/fintrack-*` e seguem estas regras como base.

## Stack

React 18 + TypeScript (strict) + Vite + React Router v6 + TanStack Query v4 + react-hook-form + Zod + Axios + Tailwind + Radix UI + Cypress.

## Arquitetura em camadas

```
src/
├── app/                    # Camada de negócio (puro, sem JSX)
│   ├── config/             # constantes, localStorageKeys
│   ├── entities/           # interfaces TS (User, BankAccount, Transaction)
│   ├── services/           # acesso à API via httpClient
│   ├── hooks/              # wrappers de useQuery/useMutation
│   ├── contexts/           # contextos globais (AuthContext)
│   └── utils/              # funções puras (cn, formatCurrency, ...)
├── view/                   # Camada de apresentação (JSX, Tailwind)
│   ├── components/         # componentes reutilizáveis
│   ├── layouts/            # layouts de página
│   ├── pages/{Page}/       # páginas com controller hook
│   │   ├── index.tsx
│   │   ├── use{Page}Controller.ts
│   │   ├── components/     # componentes locais da página
│   │   └── modals/         # modais locais da página
│   └── constants/          # constantes de UI (cores, mensagens)
└── Router/                 # rotas + AuthGuard
```

**Regra:** `view/` importa de `app/`, nunca o contrário. `app/` não conhece JSX.

## Idioma

- Strings de UI, mensagens Zod, toasts: **PT-BR**.
- Nomes de identificadores (variáveis, funções, tipos): **inglês**.

## Convenções de código

### Naming e arquivos
- Componentes: `PascalCase.tsx` (`Button.tsx`, `AccountCard.tsx`)
- Hooks/utils/services: `camelCase.ts` (`useAuth.ts`, `bankAccountsService.ts`)
- Constantes-objeto: `camelCase` ou `PascalCase` (`localStorageKeys`, `AuthenticationConstants`)
- Pasta de página/modal: `PascalCase/` com `index.tsx` dentro

### Imports
- **Sempre relativos** — não há path alias configurado. Caminhos profundos (`../../../../app/services`) são aceitáveis.

### Componentes
- Funcionais, com hooks. Evite classes.
- Props tipadas como `interface` que **estende `ComponentProps<'element'>`** quando envolve elemento HTML nativo.
- Inputs/elementos focáveis usam `forwardRef` para expor o ref ao react-hook-form.
- Variantes via prop booleana (ex.: `isLoading`, `danger`, `ghost` no `Button`).

### Styling
- **Tailwind exclusivo.** Sem CSS modules, sem styled-components.
- Composição condicional com `cn()` (clsx + tailwind-merge), em `src/app/utils/cn.ts`.
- Paleta customizada definida em `tailwind.config.js`.

### Service layer (`src/app/services/`)
Cada recurso em um arquivo `{resource}Service.ts`:

```ts
import { httpClient } from './httpClient'

interface FooParams { /* ... */ }
interface FooResponse { /* ... */ }

export async function create(params: FooParams) {
  const { data } = await httpClient.post('/foos', params)
  return data
}
// ... update, remove, getAll

export const fooService = { create, update, remove, getAll }
```

Regras:
- Funções nomeadas exportadas individualmente **e** em namespace object (`fooService`).
- Interfaces de request/response co-localizadas (e exportadas se usadas fora).
- `httpClient` (axios) já injeta `Authorization: Bearer` via interceptor.

### Hooks de dados (`src/app/hooks/`)
Wrappers finos sobre TanStack Query, expõem API ergonômica:

```ts
export function useBankAccounts () {
  const { data, isFetching } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: bankAccountsService.getAll,
    staleTime: Infinity
  })
  return { accounts: data ?? [], isFetching }
}
```

### Controller Pattern (forms / lógica de página)
Toda página/modal com form ou lógica não-trivial separa render de lógica num hook irmão:

```
pages/Login/
├── index.tsx              # só JSX, consome o controller
└── useLoginController.ts  # form, mutation, side-effects
```

O controller:
- Define `schema` Zod no topo do arquivo
- `type FormData = z.infer<typeof schema>`
- Usa `useForm<FormData>({ resolver: zodResolver(schema) })`
- Renomeia `handleSubmit` do RHF para `hookFormSubmit`, expõe `handleSubmit = hookFormSubmit(async data => { ... })`
- Encapsula `useMutation` e chamadas a outros hooks/contextos
- Em sucesso: `queryClient.invalidateQueries`, `toast.success(...)`, `reset()`, fechar modal
- Em erro: `toast.error(...)` em PT-BR
- Retorna API plana: `{ register, errors, handleSubmit, isLoading, control?, ... }`

### State management
- **Server state:** TanStack Query (sempre via hook em `app/hooks/`)
- **Form state:** react-hook-form + Zod
- **Feature/UI state local:** Context co-localizado (ex.: `DashboardContext` para abrir/fechar modais)
- **Auth global:** `AuthContext` em `app/contexts/`
- **Não usar:** Redux, Zustand, Recoil

### Modais de página (Dashboard)
Estrutura:
```
pages/Dashboard/modals/{Name}Modal/
├── index.tsx
└── use{Name}ModalController.ts
```
- Aberto/fechado via flags no `DashboardContext` (`isXModalOpen`, `toggleCloseXModal`)
- Para "edit", o contexto guarda também `xBeingEdited` (entidade selecionada)
- Usa o componente `Modal` de `view/components/Modal.tsx`

## Testes (Cypress e2e)

- Pasta: `cypress/e2e/{feature}.cy.ts`
- Estilo: `describe` + `it` imperativo, sem page objects
- Seletores: `cy.get('#id')` ou `cy.contains('texto')`
- Comandos customizados em `cypress/support/commands.ts` (ex.: `cy.register()`)
- Visit absoluto: `cy.visit('http://localhost:5173/...')`

## Anti-padrões a evitar

- ❌ Lógica de form/mutation dentro de `index.tsx` (extraia para controller)
- ❌ Chamar `httpClient` diretamente em componente (use service + hook)
- ❌ CSS modules, styled-components, classes condicionais sem `cn()`
- ❌ Path alias (`@/...`) — usar relativo
- ❌ Inglês em strings de UI/erro do Zod (sempre PT-BR)
- ❌ Componente sem `forwardRef` quando recebe `register(...)` do RHF
- ❌ Importar de `view/` dentro de `app/`
