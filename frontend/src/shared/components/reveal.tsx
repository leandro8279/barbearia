import type { ReactNode } from 'react';
import { useInView, UseInViewOptions } from '@/shared/hooks/use-in-view';
import { cn } from '@/shared/lib/utils';

export interface RevealProps extends UseInViewOptions {
  children: ReactNode;
  className?: string;
}

export function Reveal({ children, className, threshold, rootMargin, once }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold, rootMargin, once });
  return (
    <div ref={ref} className={cn('transition-opacity duration-500 motion-reduce:transition-none', inView ? 'opacity-100' : 'opacity-0', className)}>
      {children}
    </div>
  );
}
