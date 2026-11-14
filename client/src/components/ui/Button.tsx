import { forwardRef} from 'react';
import type {ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<Variant, string> = {
      primary: 'bg-[#0F766E] hover:bg-[#0d6760] text-white focus-visible:ring-[#0F766E]',
      secondary:
        'bg-white border border-[#DCE1E7] text-[#1F2937] hover:bg-[#F4F6F8] focus-visible:ring-[#0F766E]',
      ghost: 'bg-transparent text-[#1F2937] hover:bg-[#F4F6F8]',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600',
    };

    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading ? 'Please wait…' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';