import {
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/react-query';

import { queryClient } from '@/shared/lib/query-client';

import { createAtom, observable, runInAction } from 'mobx';

export class MobxQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  private observer?: QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
  private unsubscribe?: () => void;
  private lastKeyHash?: string;

  // Muda a cada notificação do TanStack, fazendo os computed/observers recalcularem
  private readonly version = observable.box(0);

  // Liga/desliga a subscrição conforme alguém observa ou deixa de observar
  private readonly atom = createAtom(
    'MobxQuery',
    () => this.subscribe(),
    () => this.stop(),
  );

  constructor(
    private readonly baseOptions: Partial<
      QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
    > = {},
  ) {}

  query(
    options?: Partial<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>>,
  ): QueryObserverResult<TData, TError> {
    const merged = queryClient.defaultQueryOptions({
      ...this.baseOptions,
      ...options,
    } as QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>);

    const keyHash = JSON.stringify(merged.queryKey ?? null);

    if (!this.observer) {
      this.observer = new QueryObserver(queryClient, merged);
      this.lastKeyHash = keyHash;
    } else if (keyHash !== this.lastKeyHash) {
      // Só reconfigura quando a chave muda (evita churn a cada getter)
      this.observer.setOptions(merged);
      this.lastKeyHash = keyHash;
    }

    this.atom.reportObserved(); // dispara subscribe() se for o primeiro observador
    this.version.get(); // cria a dependência para reagir às atualizações

    // Leitura pura: não escreve em nenhum observable dentro do computed
    return this.observer.getOptimisticResult(merged);
  }

  private subscribe() {
    this.unsubscribe?.();
    this.unsubscribe = this.observer?.subscribe(() =>
      runInAction(() => this.version.set(this.version.get() + 1)),
    );
  }

  private stop() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
