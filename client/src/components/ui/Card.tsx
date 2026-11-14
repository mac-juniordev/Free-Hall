import type { ReactNode } from 'react';
import clsx from 'clsx';

type CardProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

export function Card({ children, className, padded = true }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-[#DCE1E7] bg-white shadow-sm',
        padded && 'p-5',
        className
      )}
    >
      {children}
    </div>
  );
}