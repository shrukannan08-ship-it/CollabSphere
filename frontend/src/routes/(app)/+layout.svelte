<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore, currentProfile, ui } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}
	let { children }: Props = $props();

	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);
	let profileMenuOpen = $state(false);

	// Redirect if not authenticated
	onMount(() => {
		const unsub = authStore.subscribe((state) => {
			if (state.isInitialized && !state.user) {
				goto('/login');
				unsub();
			}
		});
	});

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'home' },
		{ href: '/projects', label: 'Explore Projects', icon: 'folder' },
		{ href: '/discover', label: 'Discover Peers', icon: 'users' },
		{ href: '/positions', label: 'Recruitment', icon: 'briefcase' },
		{ href: '/positions/my-applications', label: 'My Applications', icon: 'star' },
	];

	function isActive(href: string): boolean {
		if (href === '/dashboard') return page.url.pathname === '/dashboard';
		return page.url.pathname.startsWith(href);
	}

	async function logout() {
		await authStore.logout();
		goto('/login');
	}

	let globalSearch = $state('');
	function handleGlobalSearch(e: KeyboardEvent) {
		if (e.key === 'Enter' && globalSearch.trim()) {
			goto(`/projects?q=${encodeURIComponent(globalSearch.trim())}`);
		}
	}

	// Icons matching the modern reference style
	const icons: Record<string, string> = {
		home: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
		folder: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
		users: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
		briefcase: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
		star: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
		settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
		logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
		menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
		search: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
		chat: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
		chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
		downChevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`,
	};

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const profile = $derived($currentProfile);
</script>

<div class="app-shell">
	<!-- Background Ambient Shapes (Frosted Glass & Depth) -->
	<div class="ambient-glow glow-top" aria-hidden="true"></div>
	<div class="ambient-glow glow-bottom" aria-hidden="true"></div>

	<!-- Liquid Glass Frosted Sidebar (Screenshot 4 Reference) -->
	<aside class="sidebar" class:collapsed={sidebarCollapsed} aria-label="Main navigation">
		<!-- Clover Logo & App Title -->
		<div class="sidebar-logo">
			<a href="/dashboard" class="logo-link">
				<div class="clover-mark" aria-hidden="true">
					<span class="clover-petal petal-top-left"></span>
					<span class="clover-petal petal-top-right"></span>
					<span class="clover-petal petal-bottom-left"></span>
					<span class="clover-petal petal-bottom-right"></span>
				</div>
				{#if !sidebarCollapsed}
					<div class="logo-text-wrap">
						<span class="logo-text">Dashboard</span>
						<span class="logo-sub">CollabSphere</span>
					</div>
				{/if}
			</a>
		</div>

		<!-- Nav items (with active coral pill & right chevrons matching Screenshot 4) -->
		<nav class="sidebar-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-pill-item"
					class:active={isActive(item.href)}
					title={sidebarCollapsed ? item.label : ''}
				>
					<span class="nav-icon">{@html icons[item.icon]}</span>
					{#if !sidebarCollapsed}
						<span class="nav-label">{item.label}</span>
						<span class="nav-arrow">→</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Bottom 3 Soft Circular Pills (matching Screenshot 4) -->
		{#if !sidebarCollapsed}
			<div class="sidebar-status-pills" aria-hidden="true">
				<div class="status-dot-pill dot-coral" title="Active Sessions">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
				</div>
				<div class="status-dot-pill dot-purple" title="Discussions & Threads">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
				</div>
				<div class="status-dot-pill dot-gray" title="Platform Health">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
				</div>
			</div>
		{/if}

		<!-- Sidebar footer: account settings & logout -->
		<div class="sidebar-footer">
			<a href="/profile/edit" class="nav-pill-item nav-settings" title={sidebarCollapsed ? 'Account Settings' : ''}>
				<span class="nav-icon">{@html icons.settings}</span>
				{#if !sidebarCollapsed}
					<span class="nav-label">Settings</span>
					<span class="nav-arrow">→</span>
				{/if}
			</a>
			<button class="nav-pill-item nav-logout" onclick={logout} title={sidebarCollapsed ? 'Log Out' : ''}>
				<span class="nav-icon">{@html icons.logout}</span>
				{#if !sidebarCollapsed}
					<span class="nav-label">Log Out</span>
				{/if}
			</button>
		</div>
	</aside>

	<!-- Main Workspace Area -->
	<div class="main-workspace">
		<!-- Universal Top Glass Header (matches Screenshot 4) -->
		<header class="top-header">
			<div class="header-left">
				<button
					class="hamburger-btn"
					onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
					aria-label="Toggle sidebar"
				>
					{@html icons.menu}
				</button>

				<div class="header-title-block">
					<span class="header-kit-title">Liquid Glass Kit</span>
					<div class="title-underline"></div>
				</div>

				<!-- Segmented Toggle Pill (Teams / Explore) -->
				<div class="segmented-pill-toggle">
					<a
						href="/dashboard"
						class="segment-btn"
						class:active={page.url.pathname === '/dashboard'}
					>
						Teams
					</a>
					<a
						href="/projects"
						class="segment-btn"
						class:active={page.url.pathname.startsWith('/projects')}
					>
						Explore
					</a>
				</div>
			</div>

			<div class="header-right">
				<!-- Step/Pagination Indicator from Screenshot 4 -->
				<div class="header-pagination-pill">
					<span class="pag-prev">prev →</span>
					<span class="pag-num">2</span>
					<span class="pag-range">12-13</span>
					<span class="pag-total">15</span>
				</div>

				<!-- Search Icon Glass Button -->
				<a href="/projects" class="header-icon-glass-btn" title="Search Projects">
					{@html icons.search}
				</a>

				<div class="header-notifications">
					<NotificationDropdown />
				</div>

				{#if profile}
					<a href="/profile/{profile.username}" class="header-user-avatar-btn" title="View Profile">
						<div class="user-avatar-circle">
							{#if profile.avatarUrl}
								<img src={profile.avatarUrl} alt={profile.fullName} />
							{:else}
								<span>{getInitials(profile.fullName)}</span>
							{/if}
						</div>
					</a>
				{/if}
			</div>
		</header>

		<!-- Breadcrumbs Line (Home / Projects / ...) matching Screenshot 4 -->
		<div class="breadcrumbs-bar">
			<span class="crumb-root">Home</span>
			<span class="crumb-sep">/</span>
			<span class="crumb-section">Projects</span>
			<span class="crumb-sep">/</span>
			<span class="crumb-active">
				{#if page.url.pathname === '/dashboard'}
					Beta
				{:else if page.url.pathname.startsWith('/projects')}
					Explore
				{:else if page.url.pathname.startsWith('/discover')}
					Peers
				{:else if page.url.pathname.startsWith('/positions')}
					Recruitment
				{:else}
					Active
				{/if}
			</span>
		</div>

		<!-- Main Content Stage -->
		<main class="app-main-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
		background: #f1f4f9;
		position: relative;
		overflow-x: hidden;
		font-family: var(--font-sans);
	}

	/* Ambient Background Glow */
	.ambient-glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		pointer-events: none;
		z-index: 0;
	}
	.glow-top {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(255, 122, 110, 0.08) 0%, rgba(167, 139, 250, 0.06) 100%);
		top: -120px;
		left: 100px;
	}
	.glow-bottom {
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(110, 231, 183, 0.08) 0%, rgba(147, 197, 253, 0.06) 100%);
		bottom: -150px;
		right: -100px;
	}

	/* Liquid Glass Frosted Sidebar (Screenshot 4) */
	.sidebar {
		width: 240px;
		min-height: 100vh;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		z-index: 100;
		border-right: 1px solid rgba(255, 255, 255, 0.85);
		box-shadow: 4px 0 24px rgba(15, 23, 42, 0.03), inset -1px 0 2px rgba(255, 255, 255, 0.9);
		transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
		flex-shrink: 0;
	}

	.sidebar.collapsed {
		width: 76px;
	}

	.sidebar-logo {
		padding: 24px 20px 20px;
		display: flex;
		align-items: center;
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: 12px;
		text-decoration: none;
	}

	/* 4-Color Clover / Flower Mark (Screenshot 4) */
	.clover-mark {
		width: 28px;
		height: 28px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3px;
		flex-shrink: 0;
	}
	.clover-petal {
		border-radius: 5px;
		transition: transform 0.2s ease;
	}
	.petal-top-left { background: #ff7a6e; }
	.petal-top-right { background: #6ee7b7; }
	.petal-bottom-left { background: #fbbf24; }
	.petal-bottom-right { background: #93c5fd; }

	.logo-text-wrap {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.logo-text {
		font-weight: 800;
		font-size: 1.0625rem;
		color: #1e293b;
		letter-spacing: -0.01em;
	}
	.logo-sub {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #94a3b8;
		letter-spacing: 0.04em;
	}

	.sidebar-nav {
		flex: 1;
		padding: 12px 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow-y: auto;
	}

	/* Nav items with glowing coral pill when active (Screenshot 4) */
	.nav-pill-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		margin: 0 14px;
		border-radius: 14px;
		font-size: 0.875rem;
		font-weight: 600;
		color: #64748b;
		text-decoration: none;
		transition: all 0.16s ease;
		border: none;
		background: transparent;
		cursor: pointer;
		position: relative;
	}
	.nav-pill-item:hover {
		background: rgba(255, 255, 255, 0.6);
		color: #1e293b;
	}

	.nav-pill-item.active {
		background: linear-gradient(135deg, #ff7e72 0%, #ff5d52 100%);
		color: #ffffff;
		box-shadow: 0 4px 16px rgba(255, 112, 102, 0.42);
	}
	.nav-pill-item.active .nav-icon,
	.nav-pill-item.active .nav-arrow {
		color: #ffffff;
	}

	.nav-label {
		flex: 1;
		white-space: nowrap;
	}

	.nav-arrow {
		font-size: 0.875rem;
		opacity: 0.55;
		margin-left: auto;
		transition: transform 0.15s ease;
	}
	.nav-pill-item:hover .nav-arrow {
		opacity: 1;
		transform: translateX(2px);
	}

	/* 3 Circular Soft Glass Badge Pills (Screenshot 4) */
	.sidebar-status-pills {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 20px;
		margin: 8px 14px;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.8);
		border-radius: 9999px;
		justify-content: center;
		box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9);
	}
	.status-dot-pill {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.15s ease;
	}
	.status-dot-pill:hover { transform: scale(1.1); }
	.dot-coral { background: #ffe4e2; color: #ff7066; }
	.dot-purple { background: #f3e8ff; color: #a855f7; }
	.dot-gray { background: #f1f5f9; color: #64748b; }

	.sidebar-footer {
		padding: 12px 0 16px;
		border-top: 1px solid rgba(226, 232, 240, 0.6);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.nav-logout { color: #ef4444; }
	.nav-logout:hover { background: #fee2e2; color: #b91c1c; }

	/* Main Workspace Area */
	.main-workspace {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 10;
	}

	/* Universal Top Header (Screenshot 4) */
	.top-header {
		height: 64px;
		padding: 0 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: transparent;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.hamburger-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #475569;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
		transition: all 0.15s ease;
	}
	.hamburger-btn:hover { background: #ffffff; color: #1e293b; }

	.header-title-block {
		display: flex;
		flex-direction: column;
		position: relative;
	}
	.header-kit-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: #1e293b;
		letter-spacing: -0.01em;
	}
	.title-underline {
		width: 24px;
		height: 3px;
		background: #ff7066;
		border-radius: 9999px;
		margin-top: 2px;
	}

	/* Segmented Toggle Pill (Teams / Explore) */
	.segmented-pill-toggle {
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.85);
		border-radius: 9999px;
		padding: 3px;
		box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.02);
	}
	.segment-btn {
		padding: 4px 16px;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #64748b;
		text-decoration: none;
		transition: all 0.15s ease;
	}
	.segment-btn.active {
		background: #ffffff;
		color: #1e293b;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* Step / Pagination Indicator Pill (Screenshot 4) */
	.header-pagination-pill {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 14px;
		background: rgba(255, 255, 255, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.85);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9);
	}
	.pag-prev { color: #94a3b8; }
	.pag-num { color: #1e293b; font-weight: 700; }
	.pag-range { color: #64748b; }
	.pag-total { color: #1e293b; font-weight: 700; }

	/* Circular Glass Buttons */
	.header-icon-glass-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
		text-decoration: none;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
		transition: all 0.15s ease;
	}
	.header-icon-glass-btn:hover { background: #ffffff; color: #ff7066; transform: scale(1.05); }

	.header-user-avatar-btn {
		display: flex;
		align-items: center;
		text-decoration: none;
	}
	.user-avatar-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		background: linear-gradient(135deg, #ff7e72 0%, #ff5d52 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 700;
		box-shadow: 0 2px 8px rgba(255, 112, 102, 0.35);
		border: 2px solid #ffffff;
	}
	.user-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

	/* Breadcrumbs Bar (Screenshot 4) */
	.breadcrumbs-bar {
		padding: 4px 28px 12px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #94a3b8;
	}
	.crumb-root, .crumb-section { color: #64748b; }
	.crumb-active { color: #ff7066; }

	.app-main-content {
		padding: 0 28px 40px;
		min-height: calc(100vh - 100px);
	}

	@media (max-width: 900px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			bottom: 0;
			transform: translateX(-100%);
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
		}
		.sidebar:not(.collapsed) { transform: translateX(0); }
		.top-header { padding: 0 16px; }
		.header-pagination-pill { display: none; }
		.breadcrumbs-bar { padding: 4px 16px 12px; }
		.app-main-content { padding: 0 16px 32px; }
	}
</style>
