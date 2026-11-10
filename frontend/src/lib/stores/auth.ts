import { writable, derived, get } from 'svelte/store';
import {
  authApi,
  usersApi,
  setTokens,
  clearTokens,
  loadStoredTokens,
  getAccessToken,
  type AuthUser,
  type StudentProfile,
} from '$lib/api/client';

// ---------------------------------------------------------------------------
// Auth Store
// ---------------------------------------------------------------------------
interface AuthState {
  user: AuthUser | null;
  profile: StudentProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Initialize auth state from stored tokens on app startup.
     * Call this once in root +layout.ts load function.
     */
    async initialize(): Promise<void> {
      loadStoredTokens();

      if (!getAccessToken()) {
        update((s) => ({ ...s, isInitialized: true }));
        return;
      }

      update((s) => ({ ...s, isLoading: true }));
      try {
        const [meRes, profileRes] = await Promise.all([
          authApi.me(),
          usersApi.getMe(),
        ]);
        update((s) => ({
          ...s,
          user: meRes.data,
          profile: profileRes.data,
          isLoading: false,
          isInitialized: true,
        }));
      } catch {
        // Token invalid or expired
        clearTokens();
        update(() => ({ ...initialState, isInitialized: true }));
      }
    },

    async login(email: string, password: string): Promise<void> {
      update((s) => ({ ...s, isLoading: true }));
      try {
        const res = await authApi.login({ email, password });
        setTokens(res.data.accessToken, res.data.refreshToken);
        const profileRes = await usersApi.getMe();
        update(() => ({
          user: res.data.user,
          profile: profileRes.data,
          isLoading: false,
          isInitialized: true,
        }));
      } catch (err) {
        update((s) => ({ ...s, isLoading: false }));
        throw err;
      }
    },

    async register(
      email: string,
      password: string,
      fullName: string,
      username: string
    ): Promise<void> {
      update((s) => ({ ...s, isLoading: true }));
      try {
        const res = await authApi.register({ email, password, fullName, username });
        setTokens(res.data.accessToken, res.data.refreshToken);
        const profileRes = await usersApi.getMe();
        update(() => ({
          user: res.data.user,
          profile: profileRes.data,
          isLoading: false,
          isInitialized: true,
        }));
      } catch (err) {
        update((s) => ({ ...s, isLoading: false }));
        throw err;
      }
    },

    async logout(): Promise<void> {
      try {
        const storedRefresh = localStorage.getItem('cs_refresh_token');
        if (storedRefresh) {
          await authApi.logout(storedRefresh);
        }
      } catch {
        // Best effort
      }
      clearTokens();
      set({ ...initialState, isInitialized: true });
    },

    async refreshProfile(): Promise<void> {
      try {
        const profileRes = await usersApi.getMe();
        update((s) => ({ ...s, profile: profileRes.data }));
      } catch {
        // ignore
      }
    },

    setProfile(profile: StudentProfile): void {
      update((s) => ({ ...s, profile }));
    },
  };
}

export const authStore = createAuthStore();

// Derived convenience stores
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const currentProfile = derived(authStore, ($auth) => $auth.profile);
export const isAuthenticated = derived(authStore, ($auth) => $auth.user !== null);
export const isAuthLoading = derived(authStore, ($auth) => $auth.isLoading);
export const isAdmin = derived(authStore, ($auth) => $auth.user?.role === 'admin');

// ---------------------------------------------------------------------------
// UI Store (notifications, toasts, sidebar state)
// ---------------------------------------------------------------------------
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

function createUIStore() {
  const toasts = writable<Toast[]>([]);
  const sidebarCollapsed = writable(false);
  const mobileMenuOpen = writable(false);

  function addToast(toast: Omit<Toast, 'id'>): string {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 4000;
    toasts.update((t) => [...t, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }

  function removeToast(id: string): void {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }

  return {
    toasts: { subscribe: toasts.subscribe },
    sidebarCollapsed: { subscribe: sidebarCollapsed.subscribe },
    mobileMenuOpen: { subscribe: mobileMenuOpen.subscribe },

    toast: {
      success: (title: string, message?: string) =>
        addToast({ type: 'success', title, message }),
      error: (title: string, message?: string) =>
        addToast({ type: 'error', title, message, duration: 6000 }),
      info: (title: string, message?: string) =>
        addToast({ type: 'info', title, message }),
      warning: (title: string, message?: string) =>
        addToast({ type: 'warning', title, message }),
      remove: removeToast,
    },

    toggleSidebar: () => sidebarCollapsed.update((c) => !c),
    toggleMobileMenu: () => mobileMenuOpen.update((o) => !o),
    closeMobileMenu: () => mobileMenuOpen.set(false),
  };
}

export const ui = createUIStore();
