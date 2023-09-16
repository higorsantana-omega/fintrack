import { ExitIcon } from '@radix-ui/react-icons'
import { DropdownMenu } from './DropdownMenu'
import { useAuth } from '../../app/hooks/useAuth'

export function UserMenu () {
  const { signout } = useAuth()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div className='bg-teal-50 border-teal-100 rounded-full w-12 h-12 flex justify-center items-center'>
          <span className='text-sm tracking-[-0.5px] text-teal-900 font-medium'>HS</span>
        </div>
      </DropdownMenu.Trigger>

        <DropdownMenu.Content className='w-32'>
          <DropdownMenu.Item
            onSelect={() => signout()}
            className='flex items-center justify-between'
          >
            Sair
            <ExitIcon className='w-4 h-4'/>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}