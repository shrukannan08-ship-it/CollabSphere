<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		projectsApi,
		positionsApi,
		type ProjectDetail,
		type PositionDetail,
	} from '$lib/api/client';
	import { currentProfile, currentUser, ui } from '$lib/stores/auth';

	let activeTab = $state<'all' | 'my'>('all');

	let projects = $state<ProjectDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let myProjects = $state<ProjectDetail[]>([]);
	let loadingMy = $state(false);

	let openPositions = $state<PositionDetail[]>([]);

	let searchQuery = $state('');
	let selectedDomain = $state('All');
	let selectedRecruitment = $state('');

	const domains = ['All', 'Web Dev', 'AI/ML', 'Mobile', 'Cloud/DevOps', 'Data Science', 'Security'];

	const profile = $derived($currentProfile);

	const profileCompleteness = $derived.by(() => {
		if (!profile) return 20;
		let score = 20;
		if (profile.fullName) score += 20;
		if (profile.headline) score += 15;
		if (profile.bio) score += 15;
		if (profile.avatarUrl) score += 15;
		if (profile.skills && profile.skills.length > 0) score += 15;
		return Math.min(score, 100);
	});

	$effect(() => {
		const tabParam = page.url.searchParams.get('tab');
		const qParam = page.url.searchParams.get('q');
		activeTab = tabParam === 'my' ? 'my' : 'all';
		if (qParam !== null && qParam !== searchQuery) {
			searchQuery = qParam;
		}
	});

	async function loadProjects() {
		loading = true;
		error = null;
		try {
			const params: Record<string, string> = {};
			if (searchQuery.trim()) params.q = searchQuery.trim();
			if (selectedDomain && selectedDomain !== 'All') params.domain = selectedDomain;
			if (selectedRecruitment) params.recruitmentStatus = selectedRecruitment;

			const [res, posRes] = await Promise.all([
				projectsApi.list(params),
				positionsApi.list({ isOpen: true, limit: 5 }).catch(() => ({ data: [] })),
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
		try {
			const res = await projectsApi.getMyProjects();
			myProjects = res.data ?? [];
		} catch {
			// Graceful fallback
		} finally {
			loadingMy = false;
		}
	}

	onMount(() => {
		const qParam = page.url.searchParams.get('q');
		if (qParam) searchQuery = qParam;
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
		if (tab === 'my') {
			goto('/projects?tab=my', { replaceState: true, noScroll: true });
			if (myProjects.length === 0 && !loadingMy) loadMyProjects();
		} else {
			goto('/projects', { replaceState: true, noScroll: true });
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

	function getCoverBackground(index: number): string {
		const colors = [
			'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
			'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
			'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
			'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
		];
		return colors[index % colors.length];
	}

	const recruitingProjects = $derived(projects.filter((p) => p.recruitmentStatus === 'open'));
	const activeProjects = $derived(projects.filter((p) => p.status === 'active' || p.status === 'planning'));
</script>

<svelte:head>
	<title>{activeTab === 'my' ? 'My Projects' : 'Discover Projects'} — CollabSphere</title>
</svelte:head>

<div class="projects-layout">
	<!-- Primary Column -->
	<div class="projects-main-col">
		<!-- Clean Banner matching First Reference Set (Screenshot 2) -->
		<section class="projects-hero-banner">
			<div class="hero-banner-copy">
				<h1 class="hero-banner-title">
					{activeTab === 'my' ? 'My Projects' : 'Discover Student Projects'}
				</h1>
				<p class="hero-banner-sub">
					{activeTab === 'my'
						? 'Manage your launched projects, track team capacity, and review student join requests.'
						: 'Find active student collaborations, filter by technical stack, and request to join a team.'}
				</p>
				<div class="hero-banner-actions">
					<a href="/projects/new" class="banner-btn-white">Create Project</a>
					<a href="/positions" class="banner-btn-ghost">Explore Opportunities</a>
				</div>
			</div>
			<div class="hero-banner-art" aria-hidden="true">
				<svg width="110" height="90" viewBox="0 0 120 100" fill="none">
					<rect x="14" y="54" width="92" height="16" rx="6" fill="rgba(255,255,255,0.22)"/>
					<rect x="22" y="34" width="76" height="16" rx="6" fill="rgba(255,255,255,0.32)"/>
					<rect x="30" y="14" width="60" height="16" rx="6" fill="rgba(255,255,255,0.45)"/>
				</svg>
			</div>
		</section>

		<!-- Search, Tab Switcher & Filters -->
		<div class="toolbar-card card">
			<div class="toolbar-top-row">
				<div class="tabs-pills">
					<button
						type="button"
						class="tab-pill-btn"
						class:active={activeTab === 'all'}
						onclick={() => switchTab('all')}
					>
						Explore Projects ({projects.length})
					</button>
					{#if $currentUser}
						<button
							type="button"
							class="tab-pill-btn"
							class:active={activeTab === 'my'}
							onclick={() => switchTab('my')}
						>
							My Projects ({myProjects.length})
						</button>
					{/if}
				</div>

				<form onsubmit={handleSearch} class="search-inline-form">
					<input
						type="text"
						class="search-field"
						placeholder="Search by project title, description, or skills..."
						bind:value={searchQuery}
					/>
					<button type="submit" class="search-submit-btn">Search</button>
				</form>
			</div>

			{#if activeTab === 'all'}
				<div class="domain-filter-row">
					{#each domains as domain}
						<button
							type="button"
							class="domain-chip"
							class:active={selectedDomain === domain}
							onclick={() => {
								selectedDomain = domain;
								loadProjects();
							}}
						>
							{domain}
						</button>
					{/each}

					<select
						bind:value={selectedRecruitment}
						onchange={loadProjects}
						class="recruitment-select"
						aria-label="Filter by recruitment status"
					>
						<option value="">All Statuses</option>
						<option value="open">Recruiting Only</option>
						<option value="closed">Recruitment Closed</option>
					</select>
				</div>
			{/if}
		</div>

		<!-- Content Sections -->
		{#if activeTab === 'all'}
			{#if loading}
				<div class="cards-grid">
					{#each Array(6) as _}
						<div class="skeleton card-skeleton"></div>
					{/each}
				</div>
			{:else if error}
				<div class="empty-card card">
					<p class="error-text">{error}</p>
					<button type="button" class="primary-btn" onclick={loadProjects}>Retry</button>
				</div>
			{:else if projects.length === 0}
				<div class="empty-card card">
					<h3>No projects found</h3>
					<p>There are currently no student projects matching your filters.</p>
					<a href="/projects/new" class="primary-btn">Create Project</a>
				</div>
			{:else}
				<!-- Open Recruitment Projects -->
				{#if recruitingProjects.length > 0}
					<section class="projects-group">
						<div class="group-header">
							<h2 class="group-title">Recruiting Teams</h2>
							<span class="group-count">{recruitingProjects.length} projects</span>
						</div>

						<div class="cards-grid">
							{#each recruitingProjects as proj, idx}
								<div class="project-item-card card">
									<div class="card-cover-box" style="background: {getCoverBackground(idx)}">
										<span class="domain-badge">{proj.domain || 'Project'}</span>
										<span class="status-badge open">Recruiting</span>
									</div>

									<div class="card-content">
										<h3 class="card-title">{proj.name}</h3>
										<p class="card-desc">
											{proj.tagline || (proj.description ? proj.description.slice(0, 75) + '...' : 'Student collaboration project')}
										</p>
										<div class="card-meta">
											<span>{proj.members?.length || 1}/{proj.teamSize || 4} Members</span>
											<span>{proj.skills?.length || 0} Skills</span>
										</div>
										<a href="/projects/{proj.id}" class="card-action-btn">View Project</a>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- All Matching Projects -->
				<section class="projects-group">
					<div class="group-header">
						<h2 class="group-title">All Active Projects</h2>
						<span class="group-count">{activeProjects.length || projects.length} projects</span>
					</div>

					<div class="cards-grid">
						{#each projects as proj, idx}
							<div class="project-item-card card">
								<div class="card-cover-box" style="background: {getCoverBackground(idx + 1)}">
									<span class="domain-badge">{proj.domain || 'Project'}</span>
									<span class="status-badge {proj.recruitmentStatus === 'open' ? 'open' : 'closed'}">
										{proj.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
									</span>
								</div>

								<div class="card-content">
									<h3 class="card-title">{proj.name}</h3>
									<p class="card-desc">
										{proj.tagline || (proj.description ? proj.description.slice(0, 75) + '...' : 'Student collaboration project')}
									</p>
									<div class="card-meta">
										<span>{proj.members?.length || 1}/{proj.teamSize || 4} Members</span>
										<span>{proj.skills?.length || 0} Skills</span>
									</div>
									<a href="/projects/{proj.id}" class="card-action-btn">View Project</a>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{:else}
			<!-- MY PROJECTS TAB -->
			<section class="projects-group">
				<div class="group-header">
					<h2 class="group-title">Projects Created by You</h2>
					<a href="/projects/new" class="primary-btn-sm">Create Project</a>
				</div>

				{#if loadingMy}
					<div class="cards-grid">
						{#each Array(3) as _}
							<div class="skeleton card-skeleton"></div>
						{/each}
					</div>
				{:else if myProjects.length === 0}
					<div class="empty-card card">
						<h3>No projects created yet</h3>
						<p>Launch a new project to start building a student team and recruiting collaborators.</p>
						<a href="/projects/new" class="primary-btn">Create Project</a>
					</div>
				{:else}
					<div class="cards-grid">
						{#each myProjects as proj, idx}
							<div class="project-item-card card">
								<div class="card-cover-box" style="background: {getCoverBackground(idx)}">
									<span class="domain-badge">{proj.domain || 'Project'}</span>
									<span class="status-badge {proj.recruitmentStatus === 'open' ? 'open' : 'closed'}">
										{proj.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
									</span>
								</div>

								<div class="card-content">
									<h3 class="card-title">{proj.name}</h3>
									<p class="card-desc">
										{proj.tagline || (proj.description ? proj.description.slice(0, 75) + '...' : 'Student collaboration project')}
									</p>
									<div class="card-meta">
										<span>{proj.members?.length || 1}/{proj.teamSize || 4} Members</span>
										<span>Status: {proj.status}</span>
									</div>
									<div class="owner-actions">
										<a href="/projects/{proj.id}" class="card-action-btn">Manage Project</a>
										<button
											type="button"
											class="delete-btn"
											onclick={() => handleDeleteProject(proj.id, proj.name)}
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<!-- Right Sidebar (Clean Widgets aligned with Screenshot 2) -->
	<aside class="projects-right-col">
		{#if profile}
			<div class="side-card card">
				<div class="side-header">
					<h3 class="side-title">Collaboration Status</h3>
					<span class="status-pill {profile.openToCollaborate ? 'open' : 'closed'}">
						{profile.openToCollaborate ? 'Available' : 'Busy'}
					</span>
				</div>
				<p class="side-sub">
					Your profile is {profileCompleteness}% complete. Keep your skills up to date so project leads can find you.
				</p>
				<div class="side-progress-bar">
					<div class="side-progress-fill" style="width: {profileCompleteness}%"></div>
				</div>
				<a href="/profile/edit" class="side-outline-btn">Edit Profile</a>
			</div>
		{/if}

		<div class="side-card card">
			<div class="side-header">
				<h3 class="side-title">Open Opportunities</h3>
				<a href="/positions" class="side-view-all">View All</a>
			</div>

			{#if openPositions.length === 0}
				<p class="side-empty">No open team opportunities posted right now.</p>
			{:else}
				<div class="opportunities-list">
					{#each openPositions.slice(0, 5) as pos}
						<div class="opportunity-row">
							<div class="opportunity-info">
								<h4 class="opportunity-title">{pos.title}</h4>
								<span class="opportunity-meta">
									{pos.projectName || 'Project'} · {pos.slots - pos.filledSlots} open
								</span>
							</div>
							<a href="/positions/{pos.id}/apply" class="apply-link-btn">Apply</a>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</aside>
</div>

<style>
	.projects-layout {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 24px;
		align-items: start;
	}

	.projects-main-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	/* Clean Blue Hero Banner (First Screenshot Aesthetic) */
	.projects-hero-banner {
		background: linear-gradient(135deg, #2563eb 0%, #1d72fe 65%, #3b82f6 100%);
		border-radius: 20px;
		padding: 28px 32px;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		box-shadow: 0 8px 24px rgba(29, 114, 254, 0.22);
	}

	.hero-banner-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	.hero-banner-sub {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 18px 0;
		max-width: 540px;
		line-height: 1.5;
	}

	.hero-banner-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.banner-btn-white {
		padding: 9px 18px;
		border-radius: 10px;
		background: #ffffff;
		color: #1d72fe;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
	}
	.banner-btn-white:hover {
		background: #f8fafc;
		text-decoration: none;
	}

	.banner-btn-ghost {
		padding: 9px 18px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
	}
	.banner-btn-ghost:hover {
		background: rgba(255, 255, 255, 0.25);
		text-decoration: none;
	}

	/* Toolbar Card */
	.toolbar-card {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid #e6edf5;
	}

	.toolbar-top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.tabs-pills {
		display: flex;
		gap: 8px;
	}

	.tab-pill-btn {
		padding: 8px 16px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #475569;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.tab-pill-btn.active {
		background: #1d72fe;
		border-color: #1d72fe;
		color: #ffffff;
	}

	.search-inline-form {
		display: flex;
		gap: 8px;
		flex: 1;
		max-width: 420px;
	}

	.search-field {
		flex: 1;
		height: 38px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		padding: 0 12px;
		font-size: 0.84375rem;
		color: #0f172a;
		outline: none;
	}
	.search-field:focus {
		border-color: #1d72fe;
	}

	.search-submit-btn {
		padding: 0 16px;
		height: 38px;
		border-radius: 10px;
		border: none;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.domain-filter-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.domain-chip {
		padding: 5px 12px;
		border-radius: 9999px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #475569;
		font-size: 0.78125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.domain-chip.active {
		background: #eff6ff;
		border-color: #1d72fe;
		color: #1d72fe;
	}

	.recruitment-select {
		margin-left: auto;
		height: 32px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		padding: 0 10px;
		font-size: 0.78125rem;
		color: #334155;
		background: #ffffff;
	}

	/* Project Cards Grid */
	.projects-group {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.group-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}
	.group-count {
		font-size: 0.78125rem;
		color: #64748b;
		font-weight: 500;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.project-item-card {
		background: #ffffff;
		border-radius: 18px;
		border: 1px solid #e6edf5;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.card-cover-box {
		height: 96px;
		padding: 12px 14px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.domain-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		background: #ffffff;
		color: #1d72fe;
		padding: 3px 9px;
		border-radius: 9999px;
	}

	.status-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 9999px;
	}
	.status-badge.open {
		background: #dcfce7;
		color: #15803d;
	}
	.status-badge.closed {
		background: #f1f5f9;
		color: #64748b;
	}

	.card-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.card-title {
		font-size: 0.96875rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.card-desc {
		font-size: 0.8125rem;
		color: #64748b;
		line-height: 1.45;
		margin: 0;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 600;
		color: #475569;
		margin-top: auto;
		padding-top: 8px;
	}

	.card-action-btn {
		display: block;
		text-align: center;
		padding: 8px 12px;
		border-radius: 10px;
		background: #eff6ff;
		color: #1d72fe;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
		margin-top: 4px;
	}
	.card-action-btn:hover {
		background: #dbeafe;
		text-decoration: none;
	}

	.owner-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
	.owner-actions .card-action-btn {
		flex: 1;
		margin-top: 0;
	}
	.delete-btn {
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid #fecaca;
		background: #fef2f2;
		color: #dc2626;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.empty-card {
		padding: 40px 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}
	.empty-card h3 {
		margin: 0;
		font-size: 1.125rem;
		color: #0f172a;
	}
	.empty-card p {
		margin: 0;
		font-size: 0.875rem;
		color: #64748b;
	}

	.primary-btn,
	.primary-btn-sm {
		padding: 9px 18px;
		border-radius: 10px;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		border: none;
		cursor: pointer;
		margin-top: 6px;
	}

	.card-skeleton {
		height: 240px;
		border-radius: 18px;
	}

	/* Right Sidebar */
	.projects-right-col {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.side-card {
		padding: 18px 20px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid #e6edf5;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.side-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.side-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}
	.side-view-all {
		font-size: 0.75rem;
		font-weight: 600;
		color: #1d72fe;
		text-decoration: none;
	}

	.status-pill {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 9999px;
	}
	.status-pill.open { background: #dcfce7; color: #15803d; }
	.status-pill.closed { background: #f1f5f9; color: #64748b; }

	.side-sub,
	.side-empty {
		font-size: 0.8125rem;
		color: #64748b;
		margin: 0;
		line-height: 1.45;
	}

	.side-progress-bar {
		height: 7px;
		border-radius: 9999px;
		background: #f1f5f9;
		overflow: hidden;
	}
	.side-progress-fill {
		height: 100%;
		border-radius: 9999px;
		background: #1d72fe;
	}

	.side-outline-btn {
		text-align: center;
		padding: 8px 14px;
		border-radius: 10px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #1e293b;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
	}
	.side-outline-btn:hover {
		background: #f8fafc;
		text-decoration: none;
	}

	.opportunities-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.opportunity-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 10px;
		border-radius: 12px;
		background: #f8fafc;
	}

	.opportunity-info {
		min-width: 0;
	}
	.opportunity-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
	}
	.opportunity-meta {
		font-size: 0.71875rem;
		color: #64748b;
	}

	.apply-link-btn {
		padding: 5px 11px;
		border-radius: 8px;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 600;
		text-decoration: none;
		flex-shrink: 0;
	}

	@media (max-width: 1120px) {
		.projects-layout {
			grid-template-columns: 1fr;
		}
		.cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.cards-grid {
			grid-template-columns: 1fr;
		}
		.hero-banner-art {
			display: none;
		}
		.recruitment-select {
			margin-left: 0;
		}
	}
</style>
