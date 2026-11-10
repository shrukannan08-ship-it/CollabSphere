<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore, currentProfile } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}
	let { children }: Props = $props();

	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);
	let profileMenuOpen = $state(false);

	onMount(() => {
		const unsub = authStore.subscribe((state) => {
			if (state.isInitialized && !state.user) {
				goto('/login');
				unsub();
			}
		});
	});

	const profile = $derived($currentProfile);

	const navItems = $derived([
		{ id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ id: 'discover-projects', href: '/projects', label: 'Discover Projects', icon: 'projects' },
		{ id: 'my-projects', href: '/projects?tab=my', label: 'My Projects', icon: 'myprojects' },
		{ id: 'my-teams', href: '/teams', label: 'My Teams', icon: 'teams' },
		{ id: 'opportunities', href: '/positions', label: 'Opportunities', icon: 'opportunities' },
		{ id: 'discover-peers', href: '/discover', label: 'Discover Peers', icon: 'peers' },
		{
			id: 'profile',
			href: profile ? `/profile/${profile.username}` : '/profile/edit',
			label: 'Profile',
			icon: 'profile',
		},
	]);

	function isActive(id: string): boolean {
		const path = page.url.pathname;
		const tab = page.url.searchParams.get('tab');
		switch (id) {
			case 'dashboard':
				return path === '/dashboard';
			case 'discover-projects':
				return (path === '/projects' && tab !== 'my') || (path.startsWith('/projects/') && path !== '/projects/new');
			case 'my-projects':
				return (path === '/projects' && tab === 'my') || path === '/projects/new';
			case 'my-teams':
				return path.startsWith('/teams');
			case 'opportunities':
				return path.startsWith('/positions');
			case 'discover-peers':
				return path.startsWith('/discover');
			case 'profile':
				return path.startsWith('/profile');
			default:
				return false;
		}
	}

	async function logout() {
		profileMenuOpen = false;
		await authStore.logout();
		goto('/login');
	}

	let globalSearch = $state('');
	function handleGlobalSearch(e: KeyboardEvent) {
		if (e.key === 'Enter' && globalSearch.trim()) {
			goto(`/projects?q=${encodeURIComponent(globalSearch.trim())}`);
		}
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (target && !target.closest('.profile-chip-wrap')) {
			profileMenuOpen = false;
		}
	}

	function getInitials(name: string): string {
		if (!name) return 'CS';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const icons: Record<string, string> = {
		dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`,
		projects: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
		myprojects: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
		teams: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
		opportunities: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
		peers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/></svg>`,
		profile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
		logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
		menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
		search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
		downChevron: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>`,
	};
</script>

<svelte:window onclick={handleWindowClick} />

<div class="app-canvas">
	<!-- Mobile Backdrop -->
	{#if mobileMenuOpen}
		<button
			type="button"
			class="mobile-backdrop"
			aria-label="Close navigation menu"
			onclick={() => (mobileMenuOpen = false)}
		></button>
	{/if}

	<!-- Clean White Shell Container matching First Reference Screenshot -->
	<div class="app-shell">
		<!-- Left Sidebar -->
		<aside
			class="sidebar"
			class:collapsed={sidebarCollapsed}
			class:mobile-open={mobileMenuOpen}
			aria-label="Main navigation"
		>
			<!-- Brand Logo -->
			<div class="sidebar-brand">
				<a href="/dashboard" class="brand-link" onclick={() => (mobileMenuOpen = false)}>
					<div class="brand-emblem" aria-hidden="true">
						<svg width="30" height="30" viewBox="0 0 36 36" fill="none">
							<rect width="36" height="36" rx="10" fill="#1D72FE"/>
							<circle cx="18" cy="18" r="5" fill="#FFFFFF"/>
							<path d="M10 18C10 13.58 13.58 10 18 10C22.42 10 26 13.58 26 18" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
							<path d="M13.5 24C14.7 25.4 16.3 26.2 18 26.2C19.7 26.2 21.3 25.4 22.5 24" stroke="#93C5FD" stroke-width="2.4" stroke-linecap="round"/>
						</svg>
					</div>
					{#if !sidebarCollapsed}
						<span class="brand-wordmark">CollabSphere</span>
					{/if}
				</a>
			</div>

			<!-- Structured Minimal Navigation -->
			<nav class="sidebar-nav">
				{#each navItems as item}
					<a
						href={item.href}
						class="nav-item"
						class:active={isActive(item.id)}
						title={sidebarCollapsed ? item.label : ''}
						onclick={() => (mobileMenuOpen = false)}
					>
						<span class="nav-icon">{@html icons[item.icon]}</span>
						{#if !sidebarCollapsed}
							<span class="nav-label">{item.label}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- Bottom Sign Out -->
			<div class="sidebar-footer">
				<button
					type="button"
					class="nav-item nav-logout"
					onclick={logout}
					title={sidebarCollapsed ? 'Log Out' : ''}
				>
					<span class="nav-icon">{@html icons.logout}</span>
					{#if !sidebarCollapsed}
						<span class="nav-label">Log Out</span>
					{/if}
				</button>
			</div>
		</aside>

		<!-- Right Workspace Column -->
		<div class="workspace-column">
			<!-- Clean Top Bar (Screenshot 1) -->
			<header class="top-header">
				<div class="header-left">
					<button
						type="button"
						class="hamburger-btn desktop-toggle"
						onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
						aria-label="Toggle sidebar"
					>
						{@html icons.menu}
					</button>

					<button
						type="button"
						class="hamburger-btn mobile-toggle"
						onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
						aria-label="Open navigation menu"
					>
						{@html icons.menu}
					</button>

					<div class="header-search-box">
						<span class="search-icon">{@html icons.search}</span>
						<input
							type="text"
							class="header-search-input"
							placeholder="Search projects..."
							bind:value={globalSearch}
							onkeydown={handleGlobalSearch}
							aria-label="Search projects"
						/>
					</div>
				</div>

				<div class="header-right">
					<div class="header-notifications">
						<NotificationDropdown />
					</div>

					{#if profile}
						<div class="profile-chip-wrap">
							<button
								type="button"
								class="profile-chip-btn"
								onclick={() => (profileMenuOpen = !profileMenuOpen)}
								aria-expanded={profileMenuOpen}
								aria-haspopup="menu"
							>
								<div class="chip-avatar">
									{#if profile.avatarUrl}
										<img src={profile.avatarUrl} alt={profile.fullName} />
									{:else}
										<span>{getInitials(profile.fullName)}</span>
									{/if}
								</div>
								<div class="chip-text">
									<span class="chip-greeting">Hello,</span>
									<span class="chip-name">{profile.fullName.split(' ')[0]}</span>
								</div>
								<span class="chip-chevron">{@html icons.downChevron}</span>
							</button>

							{#if profileMenuOpen}
								<div class="profile-dropdown-menu" role="menu">
									<a
										href="/profile/{profile.username}"
										class="dropdown-item"
										role="menuitem"
										onclick={() => (profileMenuOpen = false)}
									>
										View Profile
									</a>
									<a
										href="/profile/edit"
										class="dropdown-item"
										role="menuitem"
										onclick={() => (profileMenuOpen = false)}
									>
										Edit Profile
									</a>
									<a
										href="/positions/my-applications"
										class="dropdown-item"
										role="menuitem"
										onclick={() => (profileMenuOpen = false)}
									>
										My Applications
									</a>
									<div class="dropdown-divider"></div>
									<button
										type="button"
										class="dropdown-item danger"
										role="menuitem"
										onclick={logout}
									>
										Log Out
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</header>

			<!-- Main Page Viewport -->
			<main class="main-content">
				{@render children()}
			</main>
		</div>
	</div>
</div>

<style>
	.app-canvas {
		min-height: 100vh;
		background: #eef3fa;
		padding: 0;
		font-family: var(--font-sans);
	}

	.app-shell {
		display: flex;
		min-height: 100vh;
		width: 100%;
		background: #f5f8fd;
	}

	/* Left Sidebar (Clean White SaaS Design from First Screenshot) */
	.sidebar {
		width: 236px;
		min-height: 100vh;
		background: #ffffff;
		border-right: 1px solid #e6edf5;
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		z-index: 40;
		transition: width 0.2s ease;
		flex-shrink: 0;
	}

	.sidebar.collapsed {
		width: 76px;
	}

	.sidebar-brand {
		padding: 22px 20px 18px;
		display: flex;
		align-items: center;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
	}

	.brand-wordmark {
		font-size: 1.0625rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #0f172a;
	}

	.sidebar-nav {
		flex: 1;
		padding: 8px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow-y: auto;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 14px;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		text-decoration: none;
		border: none;
		background: transparent;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
	}

	.nav-item:hover {
		background: #f1f5f9;
		color: #1e293b;
		text-decoration: none;
	}

	.nav-item.active {
		background: linear-gradient(135deg, #2575fc 0%, #1d72fe 100%);
		color: #ffffff;
		font-weight: 600;
		box-shadow: 0 6px 16px rgba(29, 114, 254, 0.26);
	}

	.nav-item.active:hover {
		background: linear-gradient(135deg, #1d68e8 0%, #165fd9 100%);
		color: #ffffff;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sidebar.collapsed .nav-item {
		justify-content: center;
		padding: 12px;
	}

	.sidebar-footer {
		padding: 14px;
		border-top: 1px solid #f1f5f9;
	}

	.nav-logout {
		color: #64748b;
	}
	.nav-logout:hover {
		background: #fef2f2;
		color: #dc2626;
	}

	/* Right Workspace Column */
	.workspace-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Clean Top Bar matching First Screenshot */
	.top-header {
		height: 68px;
		background: #ffffff;
		border-bottom: 1px solid #e6edf5;
		padding: 0 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		position: sticky;
		top: 0;
		z-index: 30;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 14px;
		flex: 1;
	}

	.hamburger-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.hamburger-btn:hover {
		background: #f8fafc;
		color: #0f172a;
	}

	.mobile-toggle {
		display: none;
	}

	.header-search-box {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		max-width: 320px;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: #94a3b8;
		display: flex;
		align-items: center;
		pointer-events: none;
	}

	.header-search-input {
		width: 100%;
		height: 38px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		padding: 0 14px 0 38px;
		font-size: 0.84375rem;
		color: #0f172a;
		outline: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.header-search-input:focus {
		background: #ffffff;
		border-color: #1d72fe;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	/* User Profile Chip ("Hello, Name") */
	.profile-chip-wrap {
		position: relative;
	}

	.profile-chip-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 10px 4px 4px;
		border-radius: 9999px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.profile-chip-btn:hover {
		background: #f8fafc;
		border-color: #cbd5e1;
	}

	.chip-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #1d72fe);
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.chip-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.chip-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.15;
	}
	.chip-greeting {
		font-size: 0.6875rem;
		color: #94a3b8;
	}
	.chip-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #1e293b;
	}
	.chip-chevron {
		color: #64748b;
		display: flex;
		align-items: center;
	}

	.profile-dropdown-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		width: 196px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
		padding: 6px;
		display: flex;
		flex-direction: column;
		z-index: 50;
	}

	.dropdown-item {
		padding: 9px 12px;
		border-radius: 8px;
		font-size: 0.84375rem;
		font-weight: 500;
		color: #334155;
		text-decoration: none;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}
	.dropdown-item:hover {
		background: #f1f5f9;
		color: #0f172a;
		text-decoration: none;
	}
	.dropdown-item.danger {
		color: #dc2626;
	}
	.dropdown-item.danger:hover {
		background: #fef2f2;
	}
	.dropdown-divider {
		height: 1px;
		background: #f1f5f9;
		margin: 4px 0;
	}

	.main-content {
		flex: 1;
		padding: 24px 28px 36px;
		max-width: 1360px;
		width: 100%;
		margin: 0 auto;
	}

	.mobile-backdrop {
		display: none;
	}

	/* Responsive Breakpoints */
	@media (max-width: 900px) {
		.desktop-toggle {
			display: none;
		}
		.mobile-toggle {
			display: flex;
		}
		.sidebar {
			position: fixed;
			left: -260px;
			top: 0;
			bottom: 0;
			height: 100vh;
			transition: left 0.22s ease;
			box-shadow: 12px 0 32px rgba(15, 23, 42, 0.12);
		}
		.sidebar.mobile-open {
			left: 0;
		}
		.mobile-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(15, 23, 42, 0.35);
			border: none;
			z-index: 35;
		}
		.top-header {
			padding: 0 16px;
		}
		.main-content {
			padding: 18px 16px 28px;
		}
		.chip-text {
			display: none;
		}
	}
</style>
