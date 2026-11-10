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
		error: unknown | null;
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
	export const page: import('svelte/store').Readable<{
		url: URL;
		params: Record<string, string>;
		route: { id: string | null };
		status: number;
		error: unknown | null;
		data: Record<string, unknown>;
		form: unknown;
	}>;
	export const navigating: import('svelte/store').Readable<unknown | null>;
	export const updated: import('svelte/store').Readable<boolean> & { check(): Promise<boolean> };
}
