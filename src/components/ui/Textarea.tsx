import type { Ref, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

export default function CustomTextarea({ className, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all',
        className
      )}
      {...props}
    />
  );
}
