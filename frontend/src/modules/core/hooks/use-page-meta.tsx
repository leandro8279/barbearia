import { useEffect } from 'react'

import { setPageMetadata } from '@/shared/lib/page-meta'

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    setPageMetadata(title, description)
  }, [description, title])
}
