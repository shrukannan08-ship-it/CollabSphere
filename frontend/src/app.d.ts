// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '$app/environment' {
	export const browser: boolean;
	export const dev: boolean;
	export const building: boolean;
	export const version: string;
}

declare module '$app/navigation' {
	export function goto(
		url: string | URL,
		opts?: { replaceState?: boolean; noScroll?: boolean; keepFocus?: boolean; invalidateAll?: boolean }
	): Promise<void>;
	export function invalidate(url: string | URL | ((url: URL) => boolean)): Promise<void>;
	export function invalidateAll(): Promise<void>;
	export function preloadData(url: string | URL): Promise<unknown>;
	export function preloadCode(url: string | URL): Promise<unknown>;
}

declare module '$app/state' {
	export const page: {
		url: URL;
		params: Record<string, string>;
		route: { id: string | null };
		status: number;
		error: App.Error | null;
		data: Record<string, unknown>;
		form: unknown;
	};
	export const navigating: {
		from: unknown | null;
		to: unknown | null;
		type: string;
	} | null;
	export const updated: {
		current: boolean;
		check(): Promise<boolean>;
	};
}

declare module '$app/stores' {
	import type { Readable } from 'svelte/store';
	export const page: Readable<{
		url: URL;
		params: Record<string, string>;
		route: { id: string | null };
		status: number;
		error: App.Error | null;
		data: Record<string, unknown>;
		form: unknown;
	}>;
	export const navigating: Readable<unknown | null>;
	export const updated: Readable<boolean> & { check(): Promise<boolean> };
}

export {};
