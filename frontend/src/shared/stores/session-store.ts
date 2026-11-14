import { SessionUser } from '@/shared/types/domain';

import { makeAutoObservable, observableRef, reaction } from 'mobx';

interface PersistedSession {
  user: SessionUser | null;
  token: string | null;
}

const STORAGE_KEY = 'barbearia-session';
const STORAGE_VERSION = 1;

class SessionStore {
  token: string | null = null;
  user: SessionUser | null = null;

  #rememberOnDevice = true;

  constructor() {
    makeAutoObservable(this, { user: observableRef }, { autoBind: true });
    this.hydrate();
    reaction(
      () => ({ user: this.user, token: this.token }),
      (snapshot) => this.persist(snapshot),
    );
  }

  get isAuthenticated() {
    return this.user !== null && this.token !== null;
  }

  setUser(user: SessionUser | null) {
    this.user = user;
  }

  setSession(user: SessionUser, token: string, rememberOnDevice = true) {
    this.#rememberOnDevice = rememberOnDevice;
    this.user = user;
    this.token = token;
  }

  clearSession() {
    this.user = null;
    this.token = null;
  }

  private hydrate() {
    if (typeof window === 'undefined') return;

    const local = localStorage.getItem(STORAGE_KEY);
    const raw = local ?? sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return;

    this.#rememberOnDevice = local !== null;

    try {
      const parsed = JSON.parse(raw) as { state?: Partial<PersistedSession>; version?: number };
      if (parsed.version !== STORAGE_VERSION || !parsed.state) return;
      this.user = parsed.state.user ?? null;
      this.token = parsed.state.token ?? null;
    } catch {
      this.removePersisted();
    }
  }

  private persist(state: PersistedSession) {
    // Sessão limpa: remove em vez de gravar { user: null, token: null }
    if (state.user === null && state.token === null) {
      this.removePersisted();
      return;
    }

    const value = JSON.stringify({ state, version: STORAGE_VERSION });
    const [target, other] = this.#rememberOnDevice ? [localStorage, sessionStorage] : [sessionStorage, localStorage];

    target.setItem(STORAGE_KEY, value);
    other.removeItem(STORAGE_KEY);
  }

  private removePersisted() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export const sessionStore = new SessionStore();
