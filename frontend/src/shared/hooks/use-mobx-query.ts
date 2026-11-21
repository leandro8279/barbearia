import { useState } from 'react';

import { MobxQuery } from '@/shared/lib/query';

import type { QueryKey, QueryObserverOptions } from '@tanstack/react-query';

export function useMobxQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
) {
  const [query] = useState(() => new MobxQuery<TQueryFnData, TError, TData, TQueryData, TQueryKey>());

  return query.query(options);
}
