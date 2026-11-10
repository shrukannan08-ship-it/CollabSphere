<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, ui } from '$lib/stores/auth';
	import { ApiClientError } from '$lib/api/client';

	// Input fields initialized strictly empty (no fake/pre-filled details)
	let email = $state('');
	let password = $state('');
	let rememberMe = $state(true);
	let showPassword = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	function validate(): boolean {
		error = null;
		if (!email.trim()) {
			error = 'Please enter your username or email';
			return false;
		}
		if (!password) {
			error = 'Please enter your password';
			return false;
		}
		return true;
	}

	async function handleLogin(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		loading = true;
		error = null;
		try {
			await authStore.login(email.trim(), password);
			goto('/dashboard');
		} catch (err) {
			if (err instanceof ApiClientError) {
				if (err.status === 401) {
					error = 'Invalid username/email or password';
				} else if (err.details && err.details.length > 0) {
					error = err.details[0].message;
				} else {
					error = err.message || 'Login failed. Please check your credentials.';
				}
			} else {
				error = 'Unable to connect to server. Please try again.';
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login — CollabSphere</title>
</svelte:head>

<div class="login-viewport-wrapper">
	<!-- Glassmorphic Login Card (Exact match to reference screenshot) -->
	<div class="glass-login-card">
		<!-- Header -->
		<div class="glass-header">
			<h1 class="glass-title">Login</h1>
			<p class="glass-subtitle">Welcome back please login to your account</p>
		</div>

		<!-- Error Message Alert (if any) -->
		{#if error}
			<div class="glass-error-banner" role="alert">
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Login Form -->
		<form class="glass-form" onsubmit={handleLogin} novalidate>
			<!-- User Name Input -->
			<div class="glass-input-wrapper">
				<input
					id="username-or-email"
					type="text"
					class="glass-input-field"
					placeholder="User Name"
					bind:value={email}
					autocomplete="username"
					required
				/>
				<span class="glass-input-icon" aria-hidden="true">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
				</span>
			</div>

			<!-- Password Input with Visibility Toggle -->
			<div class="glass-input-wrapper">
				<input
					id="password"
					type={showPassword ? 'text' : 'password'}
					class="glass-input-field"
					placeholder="Password"
					bind:value={password}
					autocomplete="current-password"
					required
				/>
				<button
					type="button"
					class="glass-password-toggle-btn"
					onclick={() => (showPassword = !showPassword)}
					aria-label={showPassword ? 'Hide password' : 'Show password'}
					title={showPassword ? 'Hide password' : 'Show password'}
				>
					{#if showPassword}
						<!-- Eye Open -->
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
							<circle cx="12" cy="12" r="3"/>
						</svg>
					{:else}
						<!-- Eye Off (Slash) matching screenshot -->
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
							<line x1="1" y1="1" x2="23" y2="23"/>
						</svg>
					{/if}
				</button>
			</div>

			<!-- Remember Me Checkbox Row -->
			<div class="remember-row">
				<label class="custom-checkbox-label">
					<input
						type="checkbox"
						class="native-checkbox"
						bind:checked={rememberMe}
					/>
					<span class="custom-checkbox-box" aria-hidden="true">
						{#if rememberMe}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						{/if}
					</span>
					<span class="remember-text">Remember me</span>
				</label>
			</div>

			<!-- Login Button -->
			<button type="submit" class="glass-login-btn" disabled={loading}>
				{#if loading}
					<span class="btn-spinner" aria-hidden="true"></span>
					<span>Signing in...</span>
				{:else}
					<span>Login</span>
				{/if}
			</button>
		</form>

		<!-- Footer: Signup Link -->
		<div class="glass-footer">
			<span class="signup-prompt">Don't have an account?</span>
			<a href="/register" class="signup-link">Signup</a>
		</div>

		<!-- Sub-Footer Credit -->
		<div class="glass-credit">
			<span>created by <strong>Exnihiloo</strong></span>
		</div>
	</div>
</div>

<style>
	/* Full viewport background using the attached golden courtyard sunset image */
	.login-viewport-wrapper {
		min-height: 100vh;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background-color: #6b4e3d;
		background-image:
			linear-gradient(rgba(30, 18, 12, 0.22), rgba(30, 18, 12, 0.30)),
			url('/login-bg.jpg');
		background-size: cover;
		background-position: center center;
		background-repeat: no-repeat;
		background-attachment: fixed;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		box-sizing: border-box;
	}

	/* Center Frosted Glassmorphism Card (readable against sunlit golden sky) */
	.glass-login-card {
		width: 100%;
		max-width: 390px;
		background: rgba(38, 24, 18, 0.36);
		backdrop-filter: blur(22px);
		-webkit-backdrop-filter: blur(22px);
		border-radius: 28px;
		border: 1.5px solid rgba(255, 238, 215, 0.45);
		box-shadow:
			0 24px 60px rgba(28, 16, 10, 0.42),
			inset 0 1px 2px rgba(255, 245, 230, 0.55),
			inset 0 -1px 2px rgba(0, 0, 0, 0.14);
		padding: 40px 32px 28px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		animation: fadeInScale 0.3s ease-out;
	}

	@keyframes fadeInScale {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Card Header */
	.glass-header {
		text-align: left;
		margin-bottom: 24px;
	}

	.glass-title {
		font-size: 2.125rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0 0 8px 0;
		letter-spacing: -0.01em;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.glass-subtitle {
		font-size: 0.84375rem;
		color: rgba(255, 255, 255, 0.88);
		margin: 0;
		font-weight: 400;
		line-height: 1.4;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	/* Error Banner */
	.glass-error-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: rgba(220, 38, 38, 0.28);
		border: 1px solid rgba(254, 202, 202, 0.5);
		border-radius: 12px;
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 500;
		margin-bottom: 18px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
	.error-icon {
		font-size: 0.9375rem;
	}

	/* Form */
	.glass-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Input Wrapper */
	.glass-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.glass-input-field {
		width: 100%;
		height: 48px;
		background: rgba(255, 250, 244, 0.14);
		border: 1.2px solid rgba(255, 240, 220, 0.42);
		border-radius: 14px;
		padding: 0 46px 0 18px;
		font-size: 0.9375rem;
		color: #ffffff;
		outline: none;
		box-sizing: border-box;
		transition: all 0.2s ease;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	/* Placeholder styling: visible initially, naturally disappears on type */
	.glass-input-field::placeholder {
		color: rgba(255, 245, 232, 0.78);
		font-weight: 400;
	}

	.glass-input-field:focus {
		background: rgba(255, 250, 244, 0.22);
		border-color: rgba(255, 242, 220, 0.9);
		box-shadow:
			0 0 0 3px rgba(255, 230, 195, 0.22),
			inset 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	/* Right Icons */
	.glass-input-icon {
		position: absolute;
		right: 16px;
		color: rgba(255, 245, 232, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.glass-password-toggle-btn {
		position: absolute;
		right: 14px;
		background: transparent;
		border: none;
		color: rgba(255, 245, 232, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		cursor: pointer;
		border-radius: 6px;
		transition: color 0.15s ease, transform 0.15s ease;
	}
	.glass-password-toggle-btn:hover {
		color: #ffffff;
		transform: scale(1.08);
	}

	/* Custom Checkbox Row */
	.remember-row {
		display: flex;
		align-items: center;
		margin-top: 2px;
		margin-bottom: 6px;
	}

	.custom-checkbox-label {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		user-select: none;
	}

	.native-checkbox {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.custom-checkbox-box {
		width: 18px;
		height: 18px;
		border-radius: 5px;
		background: #c48a5a;
		border: 1px solid rgba(255, 240, 220, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.native-checkbox:not(:checked) + .custom-checkbox-box {
		background: rgba(255, 255, 255, 0.18);
	}

	.remember-text {
		font-size: 0.8125rem;
		color: rgba(255, 248, 240, 0.94);
		font-weight: 500;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
	}

	/* Login Button (warm golden-bronze gradient matching the sunset backdrop) */
	.glass-login-btn {
		width: 100%;
		height: 48px;
		border-radius: 14px;
		border: 1px solid rgba(255, 238, 210, 0.42);
		background: linear-gradient(180deg, #d49b6a 0%, #965d38 100%);
		color: #ffffff;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		box-shadow:
			0 8px 22px rgba(45, 22, 10, 0.42),
			inset 0 1px 1px rgba(255, 245, 230, 0.55);
		transition: all 0.18s ease;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
		margin-top: 4px;
	}
	.glass-login-btn:hover:not(:disabled) {
		background: linear-gradient(180deg, #dfa776 0%, #a56942 100%);
		transform: translateY(-1px);
		box-shadow:
			0 10px 26px rgba(45, 22, 10, 0.48),
			inset 0 1px 1px rgba(255, 245, 230, 0.65);
	}
	.glass-login-btn:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow: 0 4px 12px rgba(25, 48, 70, 0.35);
	}
	.glass-login-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Footer: Signup Link */
	.glass-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 20px;
		font-size: 0.8125rem;
	}

	.signup-prompt {
		color: rgba(255, 255, 255, 0.85);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.signup-link {
		color: #ffffff;
		font-weight: 700;
		text-decoration: none;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		transition: text-decoration 0.15s ease;
	}
	.signup-link:hover {
		text-decoration: underline;
	}

	/* Sub-Footer Credit */
	.glass-credit {
		text-align: center;
		margin-top: 28px;
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.65);
		letter-spacing: 0.02em;
	}
	.glass-credit strong {
		color: rgba(255, 255, 255, 0.85);
		font-weight: 700;
	}

	/* Mobile responsive adjustments */
	@media (max-width: 480px) {
		.glass-login-card {
			padding: 32px 22px 24px;
			border-radius: 22px;
		}
		.glass-title {
			font-size: 1.875rem;
		}
	}
</style>
