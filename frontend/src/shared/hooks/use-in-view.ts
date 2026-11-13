import { RefCallback, useCallback, useEffect, useState } from 'react';

export interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLElement>({ threshold = 0.15, rootMargin = '0px', once = true }: UseInViewOptions = {}): { ref: RefCallback<T>; inView: boolean } {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useCallback<RefCallback<T>>((node) => setElement(node), []);

  useEffect(() => {
    if (!element || (once && inView)) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (once && entry.isIntersecting) observer.disconnect();
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, inView, once, rootMargin, threshold]);

  return { ref, inView };
}
