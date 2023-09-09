import { CrossCircledIcon } from "@radix-ui/react-icons";
import { ComponentProps, forwardRef } from "react";
import { cn } from "../../app/utils/cn";

interface InputProps extends ComponentProps<'input'> {
  name: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, placeholder, name, id, ...props }, ref) => {
  return (
    <div className="relative">
      <input
        {...props}
        name={name}
        id={id ?? name}
        className={cn(
          "bg-white w-full rounded-lg border border-gray-500 px-3 h-[52px] text-gray-800 pt-4 peer placeholder-shown:pt-0 focus:border-gray-800 transition-all outline-none",
          error && '!border-red-900',
          className
        )}
        placeholder=" "
        ref={ref}
      />
      <label className="absolute left-[13px] text-xs top-2 pointer-events-none text-gray-700 peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 transition-all" htmlFor={id ?? name}>
        {placeholder}
      </label>

      {error && (
        <div className="flex gap-2 items-center mt-2 text-red-900">
          <CrossCircledIcon />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  )
})
