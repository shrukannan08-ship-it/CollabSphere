<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		href?: string;
		fullWidth?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: import('svelte').Snippet;
		class?: string;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		href,
		fullWidth = false,
		onclick,
		children,
		class: extraClass = ''
	}: Props = $props();

	const isDisabled = $derived(disabled || loading);
</script>

{#if href && !isDisabled}
	<a
		{href}
		class="btn btn-{variant} btn-{size} {fullWidth ? 'btn-full' : ''} {extraClass}"
	>
		{#if loading}
			<span class="btn-spinner"></span>
		{/if}
		{@render children()}
	</a>
{:else}
	<button
		{type}
		disabled={isDisabled}
		onclick={onclick}
		class="btn btn-{variant} btn-{size} {fullWidth ? 'btn-full' : ''} {extraClass}"
		aria-busy={loading}
	>
		{#if loading}
			<span class="btn-spinner"></span>
		{/if}
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-family: var(--font-sans);
		font-weight: 500;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-decoration: none;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast),
			opacity var(--transition-fast);
		white-space: nowrap;
		position: relative;
		flex-shrink: 0;
	}

	.btn:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Sizes */
	.btn-sm { padding: 6px 14px; font-size: 0.8125rem; height: 32px; }
	.btn-md { padding: 10px 20px; font-size: 0.875rem; height: 40px; }
	.btn-lg { padding: 12px 28px; font-size: 1rem; height: 48px; }

	.btn-full { width: 100%; }

	/* Variants */
	.btn-primary {
		background: var(--color-primary-500);
		color: white;
		box-shadow: 0 1px 2px rgba(91, 76, 245, 0.3);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-600);
		box-shadow: var(--shadow-brand);
	}

	.btn-secondary {
		background: var(--color-primary-50);
		color: var(--color-primary-600);
	}
	.btn-secondary:hover:not(:disabled) {
		background: var(--color-primary-100);
	}

	.btn-outline {
		background: transparent;
		color: var(--color-text-primary);
		border: 1.5px solid var(--color-border);
	}
	.btn-outline:hover:not(:disabled) {
		border-color: var(--color-neutral-400);
		background: var(--color-neutral-50);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text-secondary);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--color-neutral-100);
		color: var(--color-text-primary);
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
	}
	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}

	/* Spinner */
	.btn-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	.btn-secondary .btn-spinner,
	.btn-outline .btn-spinner,
	.btn-ghost .btn-spinner {
		border-color: rgba(91, 76, 245, 0.3);
		border-top-color: var(--color-primary-500);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
