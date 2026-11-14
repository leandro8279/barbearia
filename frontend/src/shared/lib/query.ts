import { queryClient } from '@/shared/lib/query-client';
import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from '@tanstack/react-query';

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

  // Muda a cada notificação do TanStack, fazendo os computed/observers recalcularem
  private readonly version = observable.box(0);

  // Liga/desliga a subscrição conforme alguém observa ou deixa de observar
  private readonly atom = createAtom(
    'MobxQuery',
    () => this.subscribe(),
    () => this.stop(),
  );

  constructor(private readonly baseOptions = {} as Partial<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>>) {}

  query(options?: Partial<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>>): QueryObserverResult<TData, TError> {
    const merged = queryClient.defaultQueryOptions({ ...this.baseOptions, ...options } as QueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >);

    if (this.observer) {
      this.observer.setOptions(merged);
    } else {
      this.observer = new QueryObserver(queryClient, merged);
    }

    this.atom.reportObserved(); // dispara subscribe() se for o primeiro observador
    this.version.get(); // cria a dependência para reagir às atualizações

    // Leitura pura: não escreve em nenhum observable dentro do computed
    return this.observer.getOptimisticResult(merged);
  }

  private subscribe() {
    this.unsubscribe = this.observer?.subscribe(() => runInAction(() => this.version.set(this.version.get() + 1)));
  }

  private stop() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
