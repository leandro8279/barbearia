import { queryClient } from '@/app';
import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from '@tanstack/react-query';

import { observable, runInAction } from 'mobx';

export class MobxQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  private readonly queryClient = queryClient;
  private observer?: QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
  private reactQueryResult = observable({}, { deep: false }) as QueryObserverResult<TData, TError>;
  private subscription?: () => void;
  private stopTracking?: () => void;

  constructor(private readonly baseOptions = {} as Partial<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>>) {}

  query(options?: Partial<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>>): QueryObserverResult<TData, TError> {
    const mergedOptions = this.queryClient.defaultQueryOptions({ ...this.baseOptions, ...options } as QueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >);

    if (this.observer) {
      this.observer.setOptions(mergedOptions);
    } else {
      const observer = (this.observer = new QueryObserver(this.queryClient, mergedOptions));

      runInAction(() => Object.assign(this.reactQueryResult, observer.getCurrentResult()));

      this.subscription = observer.subscribe((result) => runInAction(() => Object.assign(this.reactQueryResult, result)));
    }

    return this.reactQueryResult;
  }

  dispose() {
    this.subscription?.();
    this.stopTracking?.();
    this.stopTracking = this.subscription = this.observer = undefined;
  }
}
