<script lang="ts">
	import { ui } from '$lib/stores/auth';
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';

	const toasts = ui.toasts;

	const icons = {
		success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
		error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
		warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
		info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
	};
</script>

<div class="toast-container" aria-live="polite" aria-atomic="false">
	{#each $toasts as toast (toast.id)}
		<div
			class="toast toast-{toast.type}"
			animate:flip={{ duration: 200 }}
			in:fly={{ y: 16, duration: 200 }}
			out:fade={{ duration: 150 }}
			role="alert"
		>
			<span class="toast-icon">{@html icons[toast.type]}</span>
			<div class="toast-content">
				<p class="toast-title">{toast.title}</p>
				{#if toast.message}
					<p class="toast-message">{toast.message}</p>
				{/if}
			</div>
			<button
				class="toast-close"
				onclick={() => ui.toast.remove(toast.id)}
				aria-label="Dismiss notification"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 24px;
		right: 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 9999;
		max-width: 380px;
		width: calc(100vw - 48px);
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-lg);
		pointer-events: auto;
	}

	.toast-icon {
		flex-shrink: 0;
		margin-top: 1px;
		display: flex;
	}

	.toast-success .toast-icon { color: var(--color-success); }
	.toast-error .toast-icon { color: var(--color-error); }
	.toast-warning .toast-icon { color: var(--color-warning); }
	.toast-info .toast-icon { color: var(--color-info); }

	.toast-success { border-left: 3px solid var(--color-success); }
	.toast-error { border-left: 3px solid var(--color-error); }
	.toast-warning { border-left: 3px solid var(--color-warning); }
	.toast-info { border-left: 3px solid var(--color-info); }

	.toast-content {
		flex: 1;
		min-width: 0;
	}

	.toast-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.toast-message {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 2px 0 0;
	}

	.toast-close {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 2px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		transition: color var(--transition-fast);
	}
	.toast-close:hover {
		color: var(--color-text-secondary);
	}
</style>
