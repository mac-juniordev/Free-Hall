import { forwardRef } from 'react';
import type { InputHTMLAttributes} from 'react';
import clsx from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[#1F2937]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'h-10 w-full rounded-md border bg-white px-3 text-sm text-[#1F2937] ' +
              'placeholder:text-[#9CA3AF] ' +
              'focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] ' +
              'disabled:bg-[#F4F6F8] disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-[#DCE1E7]',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-[#6B7280]">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';