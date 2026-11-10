<script lang="ts">
	import { onMount } from 'svelte';
	import {
		projectsApi,
		positionsApi,
		type ProjectDetail,
		type PositionDetail,
	} from '$lib/api/client';
	import { currentProfile, currentUser, ui } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';

	let activeTab = $state<'all' | 'my'>('all');

	// Real data
	let projects = $state<ProjectDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let myProjects = $state<ProjectDetail[]>([]);
	let loadingMy = $state(false);
	let myError = $state<string | null>(null);

	let openPositions = $state<PositionDetail[]>([]);

	// Filters
	let searchQuery = $state('');
	let selectedDomain = $state('All');
	let selectedStatus = $state('');
	let selectedRecruitment = $state('');
	let achievementUnlocked = $state(true);

	const domains = ['All', 'Web Dev', 'AI/ML', 'Mobile', 'Cloud/DevOps', 'Data Science', 'Security'];

	const profile = $derived($currentProfile);

	async function loadProjects() {
		loading = true;
		error = null;
		try {
			const params: Record<string, string> = {};
			if (searchQuery.trim()) params.q = searchQuery.trim();
			if (selectedDomain && selectedDomain !== 'All') params.domain = selectedDomain;
			if (selectedStatus) params.status = selectedStatus;
			if (selectedRecruitment) params.recruitmentStatus = selectedRecruitment;

			const [res, posRes] = await Promise.all([
				projectsApi.list(params),
				positionsApi.list({ limit: 5 }).catch(() => ({ data: [] })),
			]);
			projects = res.data ?? [];
			openPositions = posRes.data ?? [];
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	async function loadMyProjects() {
		if (!$currentUser) return;
		loadingMy = true;
		myError = null;
		try {
			const res = await projectsApi.getMyProjects();
			myProjects = res.data ?? [];
		} catch (err: unknown) {
			myError = (err as Error).message ?? 'Failed to load your projects';
		} finally {
			loadingMy = false;
		}
	}

	onMount(() => {
		loadProjects();
		if ($currentUser) {
			loadMyProjects();
		}
	});

	function handleSearch(e: Event) {
		e.preventDefault();
		loadProjects();
	}

	function switchTab(tab: 'all' | 'my') {
		activeTab = tab;
		if (tab === 'my' && myProjects.length === 0 && !loadingMy) {
			loadMyProjects();
		}
	}

	async function handleDeleteProject(id: string, name: string) {
		if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
			return;
		}
		try {
			await projectsApi.delete(id);
			ui.toast.success('Project deleted', `"${name}" has been removed.`);
			myProjects = myProjects.filter((p) => p.id !== id);
			projects = projects.filter((p) => p.id !== id);
		} catch (err: unknown) {
			ui.toast.error('Delete failed', (err as Error).message ?? 'Could not delete project');
		}
	}

	function getCoverBackground(index: number, domain?: string | null): string {
		const colors = [
			'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
			'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
			'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
			'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
		];
		return colors[index % colors.length];
	}

	const ongoingProjects = $derived(
		projects.filter((p) => p.status === 'active' || p.status === 'planning')
	);
	const popularProjects = $derived(
		projects.filter((p) => p.recruitmentStatus === 'open')
	);
</script>

<svelte:head>
	<title>Projects Showcase & Library — CollabSphere</title>
</svelte:head>

<div class="projects-layout-grid">
	<!-- Main Center Column -->
	<div class="projects-main-col">
		<!-- Top Cosmic Luminous Glass Hero (exact matching Screenshot 3) -->
		<div class="hero-cosmic-glass">
			<!-- Floating ambient sparkles and crystals -->
			<div class="cosmic-crystal crystal-1" aria-hidden="true"></div>
			<div class="cosmic-crystal crystal-2" aria-hidden="true"></div>
			<div class="cosmic-crystal crystal-3" aria-hidden="true"></div>

			<div class="cosmic-header-row">
				<span class="cosmic-service-label">CollabSphere Directory</span>
				<h1 class="cosmic-main-title">Our Services</h1>
				<p class="cosmic-sub-title">Connect with student teams, explore groundbreaking projects, and build together.</p>
			</div>

			<!-- Luminous Gold Search Capsule (Screenshot 3) -->
			<form onsubmit={handleSearch} class="luminous-search-capsule">
				<span class="search-capsule-icon">🔍</span>
				<input
					type="text"
					class="search-capsule-input"
					placeholder="2025–2026 Projects & Skills..."
					bind:value={searchQuery}
				/>
				<button type="submit" class="search-capsule-submit" aria-label="Search">
					›
				</button>
			</form>

			<!-- 3 Floating Luminous Glass Cards (Screenshot 3) -->
			<div class="cosmic-glass-cards-row">
				<!-- Card 1: Power 3D (AI & Robotics) -->
				<button
					type="button"
					class="luminous-glass-card"
					class:active={selectedDomain === 'AI/ML'}
					onclick={() => { selectedDomain = 'AI/ML'; loadProjects(); }}
				>
					<div class="glass-card-inner">
						<div class="card-3d-figure robot-figure">
							<!-- 3D Robot / AI Icon Representation -->
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e0e7ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="11" width="18" height="10" rx="2"/>
								<circle cx="12" cy="5" r="2"/>
								<path d="M12 7v4"/>
								<line x1="8" y1="16" x2="8" y2="16"/>
								<line x1="16" y1="16" x2="16" y2="16"/>
							</svg>
						</div>
						<span class="glass-card-title">Power 3D</span>
					</div>
				</button>

				<!-- Card 2: Data (Analytics & Engineering) -->
				<button
					type="button"
					class="luminous-glass-card"
					class:active={selectedDomain === 'Data Science'}
					onclick={() => { selectedDomain = 'Data Science'; loadProjects(); }}
				>
					<div class="glass-card-inner">
						<div class="card-3d-figure data-figure">
							<!-- 3D Donut Pie Chart Representation -->
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none">
								<circle cx="12" cy="12" r="9" stroke="#fbbf24" stroke-width="3" stroke-dasharray="14 42" fill="none"/>
								<circle cx="12" cy="12" r="9" stroke="#c084fc" stroke-width="3" stroke-dasharray="18 38" stroke-dashoffset="-14" fill="none"/>
								<circle cx="12" cy="12" r="9" stroke="#6ee7b7" stroke-width="3" stroke-dasharray="24 32" stroke-dashoffset="-32" fill="none"/>
								<circle cx="12" cy="12" r="4" fill="#1e1b4b"/>
							</svg>
						</div>
						<span class="glass-card-title">Data</span>
					</div>
				</button>

				<!-- Card 3: Media (Video & Design) -->
				<button
					type="button"
					class="luminous-glass-card"
					class:active={selectedDomain === 'Web Dev'}
					onclick={() => { selectedDomain = 'Web Dev'; loadProjects(); }}
				>
					<div class="glass-card-inner">
						<div class="card-3d-figure media-figure">
							<!-- 3D Video Player Card Representation -->
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<rect x="2" y="4" width="20" height="16" rx="3"/>
								<polygon points="10 8 16 12 10 16 10 8" fill="#f472b6"/>
							</svg>
						</div>
						<span class="glass-card-title">Media</span>
					</div>
				</button>
			</div>
		</div>

		<!-- Filter & Tabs Row -->
		<div class="filter-tabs-toolbar">
			<!-- Tab Switcher -->
			<div class="tabs-capsules">
				<button
					type="button"
					class="tab-capsule-btn"
					class:active={activeTab === 'all'}
					onclick={() => switchTab('all')}
				>
					Explore All
					{#if projects.length > 0}
						<span class="capsule-count">{projects.length}</span>
					{/if}
				</button>
				{#if $currentUser}
					<button
						type="button"
						class="tab-capsule-btn"
						class:active={activeTab === 'my'}
						onclick={() => switchTab('my')}
					>
						My Projects
						{#if myProjects.length > 0}
							<span class="capsule-count highlight">{myProjects.length}</span>
						{/if}
					</button>
				{/if}
			</div>

			<!-- Domains Filter Pills -->
			<div class="domain-pills-row">
				{#each domains as domain}
					<button
						type="button"
						class="domain-pill"
						class:active={selectedDomain === domain}
						onclick={() => {
							selectedDomain = domain;
							loadProjects();
						}}
					>
						{domain}
					</button>
				{/each}
			</div>
		</div>

		<!-- ALL PROJECTS SECTION -->
		{#if activeTab === 'all'}
			<!-- Popular / Recruiting Section (matching Screenshot 3) -->
			<section class="projects-section-block">
				<div class="section-row-header">
					<h2 class="section-category-title">Popular</h2>
					<button class="view-all-label" onclick={() => (selectedRecruitment = '')}>VIEW ALL</button>
				</div>

				{#if loading}
					<div class="skillset-cards-grid">
						{#each Array(4) as _}
							<div class="skeleton card-skillset-skeleton"></div>
						{/each}
					</div>
				{:else if projects.length === 0}
					<div class="empty-showcase-box card">
						<p>No projects currently listed. Create the first one!</p>
						<a href="/projects/new" class="hero-pill-btn">+ Create Project</a>
					</div>
				{:else}
					<div class="skillset-cards-grid">
						{#each (popularProjects.length > 0 ? popularProjects : projects).slice(0, 4) as proj, idx}
							<a href="/projects/{proj.id}" class="skillset-book-card card">
								<!-- 3D Pastel Cover Square -->
								<div class="card-pastel-cover" style="background: {getCoverBackground(idx, proj.domain)}">
									<div class="cover-domain-icon">
										<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
											<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
											<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
										</svg>
									</div>
									<div class="card-cover-badges">
										<span class="cover-badge-pill">{proj.domain || 'Tech'}</span>
										<button class="card-bookmark-btn" onclick={(e) => { e.preventDefault(); ui.toast.info('Saved to bookmarks'); }} aria-label="Bookmark">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
										</button>
									</div>
								</div>

								<!-- Card Text -->
								<div class="card-details-box">
									<h3 class="skillset-card-title">{proj.name}</h3>
									<p class="skillset-card-desc">
										{proj.tagline || proj.description.slice(0, 60) + '...'}
									</p>
									<div class="skillset-meta-row">
										<span class="capacity-pill">👥 {proj.teamSize || 4} members</span>
										<span class="status-dot-pill {proj.recruitmentStatus === 'open' ? 'open' : 'closed'}">
											{proj.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Ongoing / In-Progress Section (matching Screenshot 3) -->
			<section class="projects-section-block">
				<div class="section-row-header">
					<h2 class="section-category-title">Ongoing</h2>
					<button class="view-all-label" onclick={() => (selectedStatus = '')}>VIEW ALL</button>
				</div>

				{#if loading}
					<div class="skillset-cards-grid">
						{#each Array(4) as _}
							<div class="skeleton card-skillset-skeleton"></div>
						{/each}
					</div>
				{:else if projects.length === 0}
					<p class="empty-sub">No active projects available.</p>
				{:else}
					<div class="skillset-cards-grid">
						{#each (ongoingProjects.length > 0 ? ongoingProjects : projects).slice(0, 4) as proj, idx}
							<a href="/projects/{proj.id}" class="skillset-book-card card">
								<!-- 3D Pastel Cover Square -->
								<div class="card-pastel-cover" style="background: {getCoverBackground(idx + 2, proj.domain)}">
									<div class="cover-domain-icon">
										<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
											<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
											<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
										</svg>
									</div>
									<div class="card-cover-badges">
										<span class="cover-badge-pill">{proj.domain || 'Project'}</span>
										<button class="card-bookmark-btn" onclick={(e) => { e.preventDefault(); ui.toast.info('Saved to bookmarks'); }} aria-label="Bookmark">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
										</button>
									</div>
								</div>

								<!-- Card Text -->
								<div class="card-details-box">
									<h3 class="skillset-card-title">{proj.name}</h3>
									<p class="skillset-card-desc">
										{proj.tagline || proj.description.slice(0, 60) + '...'}
									</p>
									<div class="skillset-meta-row">
										<span class="capacity-pill">👥 {proj.teamSize || 4} members</span>
										<span class="status-dot-pill {proj.recruitmentStatus === 'open' ? 'open' : 'closed'}">
											{proj.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<!-- MY PROJECTS TAB -->
			<section class="projects-section-block">
				<div class="section-row-header">
					<h2 class="section-category-title">Projects Created by You</h2>
					<a href="/projects/new" class="hero-pill-btn">+ Start New Project</a>
				</div>

				{#if loadingMy}
					<div class="skillset-cards-grid">
						{#each Array(3) as _}
							<div class="skeleton card-skillset-skeleton"></div>
						{/each}
					</div>
				{:else if myProjects.length === 0}
					<div class="empty-showcase-box card">
						<div class="empty-icon-circle">🚀</div>
						<h3>You haven't initiated any projects yet</h3>
						<p>Ready to recruit teammates and lead a build? Kick off your first collaboration project.</p>
						<a href="/projects/new" class="hero-pill-btn">+ Create Project</a>
					</div>
				{:else}
					<div class="skillset-cards-grid">
						{#each myProjects as proj, idx}
							<div class="skillset-book-card card">
								<div class="card-pastel-cover" style="background: {getCoverBackground(idx, proj.domain)}">
									<div class="cover-domain-icon">
										<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
									</div>
									<div class="card-cover-badges">
										<span class="cover-badge-pill">{proj.domain || 'Initiative'}</span>
										<span class="cover-badge-pill status">{proj.status}</span>
									</div>
								</div>
								<div class="card-details-box">
									<a href="/projects/{proj.id}" class="skillset-card-title-link">
										<h3 class="skillset-card-title">{proj.name}</h3>
									</a>
									<p class="skillset-card-desc">{proj.tagline || proj.description.slice(0, 60) + '...'}</p>
									<div class="card-action-bar">
										<a href="/projects/{proj.id}" class="manage-btn">Manage Project →</a>
										<button class="delete-btn" onclick={() => handleDeleteProject(proj.id, proj.name)}>Delete</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<!-- Right Column (Sidebar Widgets matching Screenshot 3) -->
	<aside class="skillset-right-sidebar">
		<!-- Goal / Achievement Unlock Card -->
		<div class="achievement-card card">
			<div class="achievement-header">
				<div>
					<h3 class="achievement-title">Collab Availability</h3>
					<p class="achievement-sub">Available for student team invitations</p>
				</div>
				<!-- Toggle Switch -->
				<button
					class="toggle-switch-btn"
					class:checked={achievementUnlocked}
					onclick={() => (achievementUnlocked = !achievementUnlocked)}
					aria-label="Toggle availability"
				>
					<span class="toggle-slider"></span>
				</button>
			</div>

			{#if profile}
				<div class="student-achievement-item">
					<div class="achieve-avatar">
						{#if profile.avatarUrl}
							<img src={profile.avatarUrl} alt={profile.fullName} />
						{:else}
							<span>{profile.fullName[0]}</span>
						{/if}
					</div>
					<div class="achieve-progress-col">
						<div class="achieve-text-row">
							<span class="achieve-percent">Profile 80% Complete</span>
							<span class="achieve-time">Active Member</span>
						</div>
						<div class="achieve-progress-bar">
							<div class="achieve-fill" style="width: 80%"></div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Featured Positions / Opportunities Widget (matching Screenshot 3 "Best sales") -->
		<div class="best-initiatives-card card">
			<div class="best-header">
				<h3 class="best-title">Open Positions</h3>
				<a href="/positions" class="view-all-label">VIEW ALL</a>
			</div>

			<div class="best-items-list">
				{#if openPositions.length === 0}
					<p class="widget-empty">No active open positions right now.</p>
				{:else}
					{#each openPositions.slice(0, 5) as pos}
						<div class="best-item-row">
							<div class="best-item-icon-box">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
							</div>
							<div class="best-item-info">
								<h4 class="best-item-name">{pos.title}</h4>
								<span class="best-item-rating">★ 5.0 · {pos.projectName || 'Project'}</span>
							</div>
							<a href="/positions/{pos.id}/apply" class="apply-order-btn">Apply</a>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</aside>
</div>

<style>
	.projects-layout-grid {
		display: grid;
		grid-template-columns: 1fr 310px;
		gap: 28px;
		align-items: start;
	}

	.projects-main-col {
		display: flex;
		flex-direction: column;
		gap: 28px;
		min-width: 0;
	}

	/* Cosmic Luminous Glass Hero (exact matching Screenshot 3) */
	.hero-cosmic-glass {
		background: radial-gradient(circle at 50% 20%, #431407 0%, #1e1b4b 45%, #0f172a 100%);
		border-radius: 28px;
		padding: 38px 32px 32px;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		overflow: hidden;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	/* Ambient Crystals */
	.cosmic-crystal {
		position: absolute;
		border-radius: 4px;
		background: #34d399;
		box-shadow: 0 0 12px #34d399, 0 0 24px rgba(52, 211, 153, 0.6);
		opacity: 0.8;
		pointer-events: none;
	}
	.crystal-1 { width: 10px; height: 10px; top: 40px; left: 80px; transform: rotate(45deg); }
	.crystal-2 { width: 8px; height: 8px; bottom: 80px; right: 90px; transform: rotate(25deg); }
	.crystal-3 { width: 12px; height: 12px; top: 60px; right: 120px; transform: rotate(60deg); }

	.cosmic-header-row {
		text-align: center;
		margin-bottom: 22px;
		z-index: 2;
	}
	.cosmic-service-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: #a78bfa;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		display: block;
		margin-bottom: 4px;
	}
	.cosmic-main-title {
		font-size: 2.25rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}
	.cosmic-sub-title {
		font-size: 0.875rem;
		color: #cbd5e1;
		margin: 0;
	}

	/* Luminous Gold/Bronze Search Capsule (Screenshot 3) */
	.luminous-search-capsule {
		position: relative;
		width: 100%;
		max-width: 480px;
		display: flex;
		align-items: center;
		padding: 4px 6px 4px 18px;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 9999px;
		box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.7), 0 8px 24px rgba(0, 0, 0, 0.25);
		margin-bottom: 28px;
		z-index: 3;
	}
	.search-capsule-icon {
		font-size: 0.9375rem;
		margin-right: 10px;
		color: #64748b;
	}
	.search-capsule-input {
		flex: 1;
		border: none;
		outline: none;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #1e293b;
		background: transparent;
	}
	.search-capsule-input::placeholder { color: #94a3b8; }
	.search-capsule-submit {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: #1e1b4b;
		color: #ffffff;
		font-size: 1.125rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.15s ease;
	}
	.search-capsule-submit:hover { transform: scale(1.08); background: #312e81; }

	/* 3 Floating Luminous Glass Cards (Screenshot 3) */
	.cosmic-glass-cards-row {
		display: flex;
		align-items: center;
		gap: 20px;
		z-index: 2;
		flex-wrap: wrap;
		justify-content: center;
	}
	.luminous-glass-card {
		width: 140px;
		height: 140px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.35);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.5);
		cursor: pointer;
		padding: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.luminous-glass-card:hover, .luminous-glass-card.active {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.22);
		border-color: rgba(255, 255, 255, 0.6);
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.8);
	}
	.glass-card-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.card-3d-figure {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.glass-card-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: -0.01em;
	}

	/* Toolbar & Filters */
	.filter-tabs-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.tabs-capsules {
		display: flex;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 9999px;
		padding: 4px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
	}

	.tab-capsule-btn {
		background: none;
		border: none;
		padding: 7px 18px;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.15s ease;
	}
	.tab-capsule-btn.active {
		background: #1d72fe;
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(29, 114, 254, 0.28);
	}

	.capsule-count {
		font-size: 0.6875rem;
		padding: 1px 6px;
		border-radius: 9999px;
		background: #f1f5f9;
		color: #475569;
	}
	.tab-capsule-btn.active .capsule-count {
		background: rgba(255, 255, 255, 0.25);
		color: #ffffff;
	}

	.domain-pills-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.domain-pill {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 9999px;
		padding: 6px 14px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.domain-pill:hover {
		border-color: #cbd5e1;
		color: #1e293b;
	}
	.domain-pill.active {
		background: #1d72fe;
		color: #ffffff;
		border-color: #1d72fe;
	}

	/* Section Blocks */
	.projects-section-block {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-row-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-category-title {
		font-size: 1.25rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.view-all-label {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 700;
		color: #94a3b8;
		cursor: pointer;
		letter-spacing: 0.05em;
		text-decoration: none;
	}
	.view-all-label:hover { color: #1d72fe; }

	/* 4-column cards grid matching Screenshot 3 */
	.skillset-cards-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.skillset-book-card {
		background: #ffffff;
		border-radius: 20px;
		overflow: hidden;
		border: 1px solid #e2e8f0;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.skillset-book-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
		border-color: #cbd5e1;
	}

	.card-pastel-cover {
		height: 125px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
	}

	.cover-domain-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-cover-badges {
		position: absolute;
		bottom: 8px;
		left: 10px;
		right: 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.cover-badge-pill {
		background: rgba(255, 255, 255, 0.85);
		color: #1e293b;
		padding: 2px 8px;
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 700;
		backdrop-filter: blur(4px);
	}
	.cover-badge-pill.status {
		text-transform: capitalize;
		background: #dbeafe;
		color: #1e40af;
	}

	.card-bookmark-btn {
		background: rgba(255, 255, 255, 0.85);
		border: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
		cursor: pointer;
	}
	.card-bookmark-btn:hover { color: #1d72fe; }

	.card-details-box {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.skillset-card-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.skillset-card-title-link { text-decoration: none; }

	.skillset-card-desc {
		font-size: 0.75rem;
		color: #64748b;
		margin: 0;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.skillset-meta-row {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 8px;
	}

	.capacity-pill {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #475569;
	}

	.status-dot-pill {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
	}
	.status-dot-pill.open { background: #dcfce7; color: #166534; }
	.status-dot-pill.closed { background: #fee2e2; color: #991b1b; }

	.card-action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: 8px;
	}

	.manage-btn {
		font-size: 0.75rem;
		font-weight: 700;
		color: #1d72fe;
		text-decoration: none;
	}
	.delete-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		color: #ef4444;
		cursor: pointer;
	}

	.empty-showcase-box {
		padding: 40px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: #94a3b8;
	}

	.card-skillset-skeleton {
		height: 220px;
		border-radius: 20px;
	}

	/* Right Sidebar (matching Screenshot 3) */
	.skillset-right-sidebar {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.achievement-card {
		background: #ffffff;
		border-radius: 20px;
		padding: 20px;
		border: 1px solid #e2e8f0;
	}

	.achievement-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.achievement-title {
		font-size: 0.9375rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.achievement-sub {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 2px 0 0;
	}

	.toggle-switch-btn {
		width: 40px;
		height: 22px;
		border-radius: 9999px;
		background: #cbd5e1;
		border: none;
		position: relative;
		cursor: pointer;
		transition: background 0.2s ease;
	}
	.toggle-switch-btn.checked { background: #6366f1; }
	.toggle-slider {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #ffffff;
		position: absolute;
		top: 3px;
		left: 3px;
		transition: transform 0.2s ease;
	}
	.toggle-switch-btn.checked .toggle-slider { transform: translateX(18px); }

	.student-achievement-item {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.achieve-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		background: #e0e7ff;
		color: #4f46e5;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.achieve-avatar img { width: 100%; height: 100%; object-fit: cover; }

	.achieve-progress-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.achieve-text-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
	}
	.achieve-percent { font-weight: 700; color: #4f46e5; }
	.achieve-time { color: #94a3b8; }

	.achieve-progress-bar {
		height: 4px;
		border-radius: 9999px;
		background: #e2e8f0;
		overflow: hidden;
	}
	.achieve-fill {
		height: 100%;
		background: #6366f1;
		border-radius: 9999px;
	}

	/* Best Initiatives / Open Roles (matching Screenshot 3 "Best sales") */
	.best-initiatives-card {
		background: #ffffff;
		border-radius: 20px;
		padding: 20px;
		border: 1px solid #e2e8f0;
	}

	.best-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.best-title {
		font-size: 0.9375rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.best-items-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.best-item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 0;
	}

	.best-item-icon-box {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #eff6ff;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.best-item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.best-item-name {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.best-item-rating {
		font-size: 0.6875rem;
		color: #64748b;
	}

	.apply-order-btn {
		background: #eff6ff;
		color: #1d72fe;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		padding: 4px 12px;
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.15s ease;
	}
	.apply-order-btn:hover {
		background: #1d72fe;
		color: #ffffff;
	}

	@media (max-width: 1100px) {
		.projects-layout-grid {
			grid-template-columns: 1fr;
		}
		.skillset-cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.hero-3d-left, .hero-3d-right {
			display: none;
		}
		.skillset-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
