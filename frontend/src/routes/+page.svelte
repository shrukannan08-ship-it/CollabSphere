<script lang="ts">
	import { goto } from '$app/navigation';
	import { isAuthenticated, authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	// Redirect authenticated users to dashboard, guests to login
	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (!state.isInitialized) return;
			if (state.user) {
				goto('/dashboard');
			} else {
				goto('/login');
			}
			unsubscribe();
		});
	});
</script>

<!-- Splash / redirect screen -->
<div class="splash">
	<div class="splash-logo">
		<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="20" cy="20" r="20" fill="#5B4CF5" />
			<path d="M12 20C12 15.58 15.58 12 20 12C24.42 12 28 15.58 28 20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
			<circle cx="20" cy="20" r="4" fill="white"/>
			<path d="M16 26C16 26 17.5 28 20 28C22.5 28 24 26 24 26" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
		</svg>
		<span>CollabSphere</span>
	</div>
	<div class="splash-spinner"></div>
</div>

<style>
	.splash {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--color-bg);
		gap: 32px;
	}
	.splash-logo {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.splash-spinner {
		width: 28px;
		height: 28px;
		border: 3px solid var(--color-neutral-200);
		border-top-color: var(--color-primary-500);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
