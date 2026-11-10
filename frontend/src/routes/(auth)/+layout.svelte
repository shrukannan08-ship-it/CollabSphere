<script lang="ts">
	import { isAuthenticated, authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	interface Props {
		children: import('svelte').Snippet;
	}
	let { children }: Props = $props();

	const isLoginPage = $derived(page.url.pathname === '/login');

	// If user is already logged in, redirect to dashboard
	onMount(() => {
		const unsub = authStore.subscribe((state) => {
			if (state.isInitialized && state.user) {
				goto('/dashboard');
				unsub();
			}
		});
	});
</script>

{#if isLoginPage}
	<div class="auth-fullscreen-container">
		{@render children()}
	</div>
{:else}
	<div class="auth-shell">
		<!-- Left panel: branding -->
		<div class="auth-branding" aria-hidden="true">
			<div class="auth-brand-inner">
				<div class="auth-logo">
					<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.15)" />
						<circle cx="22" cy="22" r="5" fill="white" />
						<path d="M14 22C14 17.58 17.58 14 22 14C26.42 14 30 17.58 30 22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
						<path d="M17 29C17 29 18.5 32 22 32C25.5 32 27 29 27 29" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
					</svg>
					<span>CollabSphere</span>
				</div>

				<div class="auth-tagline">
					<h1>Where student builders connect</h1>
					<p>Find teammates, build projects, grow your skills, and collaborate across universities worldwide.</p>
				</div>

				<div class="auth-features">
					{#each ['AI-powered teammate matching', 'Cross-team collaboration', 'Project showcase & portfolio', 'Hackathons & opportunities'] as feature}
						<div class="auth-feature">
							<span class="auth-feature-dot"></span>
							<span>{feature}</span>
						</div>
					{/each}
				</div>

				<!-- Decorative circles -->
				<div class="auth-deco deco-1"></div>
				<div class="auth-deco deco-2"></div>
				<div class="auth-deco deco-3"></div>
			</div>
		</div>

		<!-- Right panel: form -->
		<div class="auth-content">
			<div class="auth-form-container">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.auth-fullscreen-container {
		min-height: 100vh;
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	.auth-shell {
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-height: 100vh;
	}

	/* Left — branding */
	.auth-branding {
		background: linear-gradient(135deg, #1d4ed8 0%, #1d72fe 50%, #3b82f6 100%);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px;
	}

	.auth-brand-inner {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 40px;
		max-width: 420px;
	}

	.auth-logo {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
	}

	.auth-tagline h1 {
		font-family: var(--font-display);
		font-size: 2.25rem;
		font-weight: 800;
		color: white;
		line-height: 1.15;
		margin-bottom: 16px;
	}

	.auth-tagline p {
		color: rgba(255, 255, 255, 0.8);
		font-size: 1.0625rem;
		line-height: 1.65;
	}

	.auth-features {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.auth-feature {
		display: flex;
		align-items: center;
		gap: 12px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.auth-feature-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.6);
		flex-shrink: 0;
	}

	/* Decorative circles */
	.auth-deco {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
	}
	.deco-1 { width: 400px; height: 400px; top: -100px; right: -100px; }
	.deco-2 { width: 250px; height: 250px; bottom: -60px; left: -60px; }
	.deco-3 { width: 150px; height: 150px; bottom: 200px; right: -30px; background: rgba(255,255,255,0.04); }

	/* Right — form */
	.auth-content {
		background: var(--color-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		overflow-y: auto;
	}

	.auth-form-container {
		width: 100%;
		max-width: 420px;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.auth-shell {
			grid-template-columns: 1fr;
		}
		.auth-branding {
			display: none;
		}
		.auth-content {
			padding: 32px 20px;
			min-height: 100vh;
		}
	}
</style>
