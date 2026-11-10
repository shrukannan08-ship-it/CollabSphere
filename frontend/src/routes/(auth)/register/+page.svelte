<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, ui } from '$lib/stores/auth';
	import { ApiClientError } from '$lib/api/client';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let fullName = $state('');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errors = $state<Record<string, string>>({});
	let step = $state<'form' | 'verify'>('form');

	function validate(): boolean {
		errors = {};
		if (!fullName.trim()) errors.fullName = 'Full name is required';
		else if (fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters';

		if (!username.trim()) errors.username = 'Username is required';
		else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username))
			errors.username = '3–30 chars, letters/numbers/underscores/hyphens only';

		if (!email) errors.email = 'Email is required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';

		if (!password) errors.password = 'Password is required';
		else if (password.length < 8) errors.password = 'At least 8 characters';
		else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
			errors.password = 'Must include uppercase, lowercase, and a number';

		return Object.keys(errors).length === 0;
	}

	async function handleRegister(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		loading = true;
		try {
			await authStore.register(email, password, fullName.trim(), username.toLowerCase().trim());
			step = 'verify';
		} catch (err) {
			if (err instanceof ApiClientError) {
				if (err.code === 'EMAIL_EXISTS') errors.email = 'Email is already registered';
				else if (err.code === 'USERNAME_EXISTS') errors.username = 'Username is taken';
				else if (err.details) {
					for (const d of err.details) errors[d.field] = d.message;
				} else {
					ui.toast.error('Registration failed', err.message);
				}
			} else {
				ui.toast.error('Registration failed', 'Unable to connect. Is the backend running?');
			}
		} finally {
			loading = false;
		}
	}

	// Auto-generate username from full name
	function suggestUsername() {
		if (username) return; // don't overwrite manual entry
		username = fullName
			.toLowerCase()
			.replace(/\s+/g, '')
			.replace(/[^a-z0-9_-]/g, '')
			.slice(0, 30);
	}
</script>

<svelte:head>
	<title>Create Account — CollabSphere</title>
</svelte:head>

{#if step === 'verify'}
	<div class="verify-notice" style="animation: slideUp 0.25s ease;">
		<div class="verify-icon">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5B4CF5" stroke-width="1.5">
				<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
				<polyline points="22,6 12,13 2,6"/>
			</svg>
		</div>
		<h2>Verification link sent</h2>
		<p>We sent a verification link to <strong>{email}</strong>. Check your inbox to activate your account.</p>
		<Button href="/dashboard" fullWidth>Continue to dashboard →</Button>
		<p class="verify-login">Already verified? <a href="/login">Sign in</a></p>
	</div>
{:else}
	<div class="register-page" style="animation: slideUp 0.25s ease;">
		<div class="register-header">
			<div class="mobile-logo">
				<svg width="32" height="32" viewBox="0 0 44 44" fill="none">
					<circle cx="22" cy="22" r="22" fill="#1D72FE"/>
					<circle cx="22" cy="22" r="5" fill="white"/>
					<path d="M14 22C14 17.58 17.58 14 22 14C26.42 14 30 17.58 30 22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
				</svg>
				<span>CollabSphere</span>
			</div>
			<h2>Create your account</h2>
			<p>Join thousands of students building together</p>
		</div>

		<form class="register-form" onsubmit={handleRegister} novalidate>
			<Input
				id="fullName"
				label="Full name"
				type="text"
				bind:value={fullName}
				placeholder="Full Name"
				error={errors.fullName}
				autocomplete="name"
				required
				onblur={() => suggestUsername()}
			/>

			<Input
				id="username"
				label="Username"
				type="text"
				bind:value={username}
				placeholder="Username"
				error={errors.username}
				hint="Your public handle on CollabSphere"
				autocomplete="username"
				required
			/>

			<Input
				id="email"
				label="University email"
				type="email"
				bind:value={email}
				placeholder="name@university.edu"
				error={errors.email}
				autocomplete="email"
				required
			/>

			<Input
				id="password"
				label="Password"
				type="password"
				bind:value={password}
				placeholder="Password (min. 8 characters)"
				error={errors.password}
				autocomplete="new-password"
				required
			/>

			<Button type="submit" {loading} fullWidth>
				{loading ? 'Creating account…' : 'Create account'}
			</Button>

			<p class="register-terms">
				By creating an account, you agree to the CollabSphere Community Guidelines and Student Collaboration Terms.
			</p>
		</form>

		<div class="register-divider">
			<span>Already have an account?</span>
		</div>

		<Button variant="outline" href="/login" fullWidth>Sign in</Button>
	</div>
{/if}

<style>
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.mobile-logo {
		display: none;
		align-items: center;
		gap: 10px;
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 8px;
	}

	@media (max-width: 768px) {
		.mobile-logo { display: flex; }
	}

	.register-header {
		margin-bottom: 8px;
	}

	.register-header h2 {
		font-size: 1.75rem;
		font-weight: 800;
		margin-bottom: 6px;
	}
	.register-header p { color: var(--color-text-secondary); }

	.register-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.register-terms {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-align: center;
	}
	.register-terms a { color: var(--color-primary-500); }

	.register-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--color-text-tertiary);
		font-size: 0.8125rem;
		margin-top: 4px;
	}
	.register-divider::before,
	.register-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border);
	}

	/* Verify step */
	.verify-notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16px;
		padding: 24px 0;
	}

	.verify-icon {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: var(--color-primary-50);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.verify-notice h2 {
		font-size: 1.625rem;
		font-weight: 800;
	}

	.verify-notice p {
		color: var(--color-text-secondary);
		max-width: 340px;
		line-height: 1.6;
	}

	.verify-dev {
		font-size: 0.8125rem;
		background: var(--color-neutral-100);
		border-radius: var(--radius-md);
		padding: 10px 14px;
		text-align: left;
		width: 100%;
	}

	.verify-login {
		font-size: 0.875rem;
	}
	.verify-login a { color: var(--color-primary-500); }
</style>
