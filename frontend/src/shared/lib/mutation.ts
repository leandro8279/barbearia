import type { MutateOptions, MutationObserverOptions, MutationObserverResult, QueryClient } from '@tanstack/react-query';
import { MutationObserver } from '@tanstack/react-query';

import { queryClient } from '@/shared/lib/query-client';

import { observable, runInAction } from 'mobx';

export class MobxMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown> {
  private unsubscribe?: () => void;
  private readonly queryClient: QueryClient = queryClient;
  private observer?: MutationObserver<TData, TError, TVariables, TContext>;
  private readonly reactMutationResult = observable({}, { deep: false }) as MutationObserverResult<TData, TError>;

  constructor(private defaultOptions: MutationObserverOptions<TData, TError, TVariables, TContext>) {}

  get data() {
    return this.reactMutationResult.data;
  }

  get error() {
    return this.reactMutationResult.error ?? null;
  }

  get isError() {
    return this.reactMutationResult.isError ?? false;
  }

  get isIdle() {
    return this.reactMutationResult.isIdle ?? true;
  }

  get isLoading() {
    return this.reactMutationResult.status === 'pending';
  }

  get isSuccess() {
    return this.reactMutationResult.isSuccess ?? false;
  }

  get status() {
    return this.reactMutationResult.status ?? 'idle';
  }

  mutate(variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>): MutationObserverResult<TData, TError> {
    this.mutateAsync(variables, options).catch(noop);

    return this.reactMutationResult;
  }

  async mutateAsync(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>,
  ): Promise<MutationObserverResult<TData, TError>> {
    if (this.unsubscribe) {
      this.unsubscribe?.();
    }

    this.observer = new MutationObserver(this.queryClient, this.defaultOptions);

    this.unsubscribe = this.observer.subscribe((result) => runInAction(() => Object.assign(this.reactMutationResult, result)));

    try {
      await this.observer.mutate(variables, options as MutateOptions<TData, TError, TVariables, TContext>);
    } catch {
      // error will be handled in the store/ui
    }

    return this.reactMutationResult;
  }

  dispose() {
    this.unsubscribe?.();
  }
}

function noop() {}
