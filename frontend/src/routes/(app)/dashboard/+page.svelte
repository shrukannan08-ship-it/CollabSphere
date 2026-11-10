<script lang="ts">
	import { currentProfile, currentUser } from '$lib/stores/auth';
	import {
		usersApi,
		projectsApi,
		positionsApi,
		type ProjectDetail,
		type PositionDetail,
		type ApplicationDetail,
		type JoinRequestDetail,
		type StudentProfile,
	} from '$lib/api/client';
	import { onMount } from 'svelte';

	let recentStudents = $state<StudentProfile[]>([]);
	let loadingStudents = $state(true);
	let myProjects = $state<ProjectDetail[]>([]);
	let exploreProjects = $state<ProjectDetail[]>([]);
	let openPositions = $state<PositionDetail[]>([]);
	let loadingProjects = $state(true);
	let myApplications = $state<ApplicationDetail[]>([]);
	let myJoinRequests = $state<JoinRequestDetail[]>([]);

	let projectSearchQuery = $state('');
	let selectedCategory = $state('All Categories');
	let selectedSort = $state('Alphabetical');
	let viewMode = $state<'grid' | 'list'>('grid');
	let memberFilterTab = $state<'active' | 'popular' | 'newest'>('active');
	let groupFilterTab = $state<'active' | 'newest'>('active');

	const profile = $derived($currentProfile);
	const user = $derived($currentUser);

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

	const ringRadius = 38;
	const ringCircumference = 2 * Math.PI * ringRadius;
	const ringDashOffset = $derived(
		ringCircumference - (profileCompleteness / 100) * ringCircumference
	);

	onMount(async () => {
		try {
			const [uRes, pMyRes, pListRes, posRes, appsRes, reqsRes] = await Promise.all([
				usersApi.search({ limit: 12 }).catch(() => null),
				projectsApi.getMyProjects().catch(() => null),
				projectsApi.list({ limit: 12 }).catch(() => null),
				positionsApi.list({ isOpen: true, limit: 12 }).catch(() => null),
				positionsApi.getMyApplications().catch(() => null),
				projectsApi.getMySentJoinRequests().catch(() => null),
			]);

			if (uRes) recentStudents = uRes.data ?? [];
			if (pMyRes) myProjects = pMyRes.data ?? [];
			if (pListRes) exploreProjects = pListRes.data ?? [];
			if (posRes) openPositions = posRes.data ?? [];
			if (appsRes) myApplications = appsRes.data ?? [];
			if (reqsRes) myJoinRequests = reqsRes.data ?? [];
		} catch {
			// Graceful fallback to empty state
		} finally {
			loadingStudents = false;
			loadingProjects = false;
		}
	});

	function getInitials(name?: string | null): string {
		if (!name) return 'CS';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const filteredStudents = $derived.by(() => {
		const list = [...recentStudents];
		if (memberFilterTab === 'popular') {
			return list.sort((a, b) => (b.skills?.length ?? 0) - (a.skills?.length ?? 0));
		}
		if (memberFilterTab === 'newest') {
			return list.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		}
		return list.filter((s) => s.openToCollaborate).length > 0
			? list.filter((s) => s.openToCollaborate)
			: list;
	});

	const filteredDashboardProjects = $derived.by(() => {
		let list = exploreProjects.length > 0 ? [...exploreProjects] : [...myProjects];
		if (projectSearchQuery.trim()) {
			const q = projectSearchQuery.toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					(p.description && p.description.toLowerCase().includes(q)) ||
					(p.domain && p.domain.toLowerCase().includes(q))
			);
		}
		if (selectedCategory !== 'All Categories') {
			list = list.filter(
				(p) => p.domain && p.domain.toLowerCase().includes(selectedCategory.toLowerCase())
			);
		}
		if (selectedSort === 'Alphabetical') {
			list.sort((a, b) => a.name.localeCompare(b.name));
		} else {
			list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
		return list;
	});

	const filteredGroups = $derived.by(() => {
		const list = [...myProjects];
		if (groupFilterTab === 'newest') {
			return list.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		}
		return list;
	});

	function getDomainGradient(domain?: string | null): string {
		const d = (domain || '').toLowerCase();
		if (d.includes('ai') || d.includes('ml')) {
			return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
		}
		if (d.includes('web') || d.includes('full')) {
			return 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
		}
		if (d.includes('cloud') || d.includes('devops')) {
			return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
		}
		if (d.includes('mobile')) {
			return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
		}
		return 'linear-gradient(135deg, #1d72fe 0%, #3b82f6 100%)';
	}
</script>

<svelte:head>
	<title>Dashboard — CollabSphere</title>
</svelte:head>

<div class="dashboard-layout">
	<!-- Left / Center Primary Column -->
	<div class="dashboard-main-col">
		<!-- Welcome Hero Banner (First Screenshot Reference) -->
		<section class="welcome-hero-card">
			<div class="hero-left">
				<div class="avatar-ring-wrap" title="{profileCompleteness}% Profile Complete">
					<svg class="progress-ring-svg" width="88" height="88" viewBox="0 0 88 88">
						<circle
							cx="44"
							cy="44"
							r={ringRadius}
							stroke="rgba(29, 114, 254, 0.16)"
							stroke-width="4"
							fill="none"
						/>
						<circle
							cx="44"
							cy="44"
							r={ringRadius}
							stroke="#1D72FE"
							stroke-width="4"
							stroke-linecap="round"
							fill="none"
							stroke-dasharray={ringCircumference}
							stroke-dashoffset={ringDashOffset}
							transform="rotate(-90 44 44)"
						/>
					</svg>
					<div class="hero-avatar-inner">
						{#if profile?.avatarUrl}
							<img src={profile.avatarUrl} alt={profile.fullName} />
						{:else}
							<span>{getInitials(profile?.fullName)}</span>
						{/if}
					</div>
				</div>

				<div class="hero-copy">
					<span class="hero-completion-text">
						<strong>{profileCompleteness}%</strong> Profile Complete
					</span>
					<h1 class="hero-greeting">
						Welcome, <span>{profile?.fullName?.split(' ')[0] || 'Student'}</span>
					</h1>
					<p class="hero-sub">to your Student Collaboration Dashboard</p>
					<div class="hero-cta-row">
						<a href="/profile/edit" class="hero-outline-btn">
							{profileCompleteness < 100 ? 'Complete Profile' : 'Edit Profile'}
						</a>
						<a href="/projects/new" class="hero-primary-btn">
							Create Project
						</a>
					</div>
				</div>
			</div>

			<!-- Subtle Geometric Decorative Accents matching First Screenshot -->
			<div class="hero-geo-decor" aria-hidden="true">
				<span class="geo-circle geo-1"></span>
				<span class="geo-circle geo-2"></span>
				<span class="geo-triangle"></span>
			</div>
		</section>

		<!-- 4 Pastel Stat Cards Row (First Screenshot Reference) -->
		<section class="stats-metrics-row" aria-label="Workspace statistics">
			<a href="/projects" class="stat-metric-card tint-peach">
				<div class="stat-icon-box orange">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
				</div>
				<div class="stat-text">
					<span class="stat-count">{exploreProjects.length}</span>
					<span class="stat-label">Projects</span>
				</div>
			</a>

			<a href="/positions" class="stat-metric-card tint-blue">
				<div class="stat-icon-box blue">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
				</div>
				<div class="stat-text">
					<span class="stat-count">{openPositions.length}</span>
					<span class="stat-label">Opportunities</span>
				</div>
			</a>

			<a href="/discover" class="stat-metric-card tint-mint">
				<div class="stat-icon-box green">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				</div>
				<div class="stat-text">
					<span class="stat-count">{recentStudents.length}</span>
					<span class="stat-label">Student Peers</span>
				</div>
			</a>

			<a href="/positions/my-applications" class="stat-metric-card tint-lavender">
				<div class="stat-icon-box purple">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
				</div>
				<div class="stat-text">
					<span class="stat-count">{myApplications.length + myJoinRequests.length}</span>
					<span class="stat-label">Applications</span>
				</div>
			</a>
		</section>

		<!-- Members Section (First Screenshot Reference) -->
		<section class="section-card card">
			<div class="section-header-bar">
				<div class="section-title-group">
					<span class="section-icon blue">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
					</span>
					<h2 class="section-title">Members</h2>
				</div>

				<div class="section-tabs-row">
					<button
						type="button"
						class="tab-pill-btn"
						class:active={memberFilterTab === 'active'}
						onclick={() => (memberFilterTab = 'active')}
					>
						Active
					</button>
					<button
						type="button"
						class="tab-pill-btn"
						class:active={memberFilterTab === 'popular'}
						onclick={() => (memberFilterTab = 'popular')}
					>
						Popular
					</button>
					<button
						type="button"
						class="tab-pill-btn"
						class:active={memberFilterTab === 'newest'}
						onclick={() => (memberFilterTab = 'newest')}
					>
						Newest
					</button>
					<a href="/discover" class="section-see-all">View All</a>
				</div>
			</div>

			{#if loadingStudents}
				<div class="members-loading-row">
					{#each Array(5) as _}
						<div class="skeleton member-circle-skeleton"></div>
					{/each}
				</div>
			{:else if filteredStudents.length === 0}
				<div class="empty-inline-state">
					<p>No student members found yet. Invite classmates or update your profile visibility.</p>
				</div>
			{:else}
				<div class="members-carousel-row">
					{#each filteredStudents.slice(0, 7) as student}
						<a href="/profile/{student.username}" class="member-card-item" title={student.fullName}>
							<div class="member-avatar-wrap">
								<div class="member-avatar-circle">
									{#if student.avatarUrl}
										<img src={student.avatarUrl} alt={student.fullName} />
									{:else}
										<span>{getInitials(student.fullName)}</span>
									{/if}
								</div>
								{#if student.openToCollaborate}
									<span class="online-dot" title="Open to Collaborate"></span>
								{/if}
							</div>
							<span class="member-name">{student.fullName}</span>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Projects Grid Section (First Screenshot Reference) -->
		<section class="section-card card">
			<div class="section-header-bar wrap-toolbar">
				<div class="section-title-group">
					<span class="section-icon blue">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
					</span>
					<h2 class="section-title">Projects</h2>
				</div>

				<div class="projects-toolbar">
					<div class="search-mini-box">
						<svg class="search-mini-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input
							type="text"
							class="search-mini-input"
							placeholder="Search Projects..."
							bind:value={projectSearchQuery}
							aria-label="Filter dashboard projects"
						/>
					</div>

					<select bind:value={selectedSort} class="toolbar-select" aria-label="Sort projects">
						<option value="Alphabetical">Alphabetical</option>
						<option value="Recent">Newest First</option>
					</select>

					<select bind:value={selectedCategory} class="toolbar-select" aria-label="Filter by category">
						<option value="All Categories">All Categories</option>
						<option value="Web Dev">Web Dev</option>
						<option value="AI/ML">AI/ML</option>
						<option value="Mobile">Mobile</option>
						<option value="Cloud">Cloud/DevOps</option>
					</select>

					<div class="view-toggle-group">
						<button
							type="button"
							class="view-toggle-btn"
							class:active={viewMode === 'grid'}
							onclick={() => (viewMode = 'grid')}
							aria-label="Grid view"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
						</button>
						<button
							type="button"
							class="view-toggle-btn"
							class:active={viewMode === 'list'}
							onclick={() => (viewMode = 'list')}
							aria-label="List view"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
						</button>
					</div>
				</div>
			</div>

			{#if loadingProjects}
				<div class="projects-grid">
					{#each Array(3) as _}
						<div class="skeleton project-card-skeleton"></div>
					{/each}
				</div>
			{:else if filteredDashboardProjects.length === 0}
				<div class="empty-projects-box">
					<p>No active projects available right now.</p>
					<div class="empty-cta-row">
						<a href="/projects/new" class="btn-primary-sm">Create Project</a>
						<a href="/projects" class="btn-outline-sm">Explore Projects</a>
					</div>
				</div>
			{:else}
				<div class="projects-grid {viewMode === 'list' ? 'list-layout' : ''}">
					{#each filteredDashboardProjects.slice(0, 6) as proj}
						{@const memberCount = proj.members?.length || 1}
						{@const capacity = proj.teamSize || 4}
						{@const pct = Math.min(100, Math.round((memberCount / capacity) * 100))}
						<a href="/projects/{proj.id}" class="project-card">
							<div class="project-cover" style="background: {getDomainGradient(proj.domain)}">
								<span class="cover-domain-tag">{proj.domain || 'Project'}</span>
								<span class="cover-action-pill">View Project</span>
							</div>

							<div class="project-body">
								<h3 class="project-title">{proj.name}</h3>
								<p class="project-summary">
									{proj.tagline || (proj.description ? proj.description.slice(0, 72) + '...' : 'Student collaboration project')}
								</p>

								<div class="capacity-header">
									<span class="capacity-label">Team Capacity ({memberCount}/{capacity})</span>
									<span class="capacity-pct">{pct}%</span>
								</div>
								<div class="capacity-bar">
									<div class="capacity-fill" style="width: {pct}%"></div>
								</div>

								<div class="project-meta-chips">
									<span class="meta-chip orange">{capacity} Members</span>
									<span class="meta-chip green">{proj.skills?.length || 0} Skills</span>
									<span class="meta-chip purple">
										{proj.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
									</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Right Widgets Column (First Screenshot Reference) -->
	<aside class="dashboard-right-col" aria-label="Dashboard activity and quick lists">
		<!-- Discussions Widget -->
		<div class="widget-card card">
			<div class="widget-header">
				<div class="widget-title-wrap">
					<span class="widget-icon blue">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
					</span>
					<h3 class="widget-title">Discussions</h3>
				</div>
				<a href="/projects" class="widget-link blue">View All</a>
			</div>

			<div class="widget-list">
				{#if exploreProjects.length === 0}
					<p class="widget-empty">No active project discussions yet.</p>
				{:else}
					{#each exploreProjects.slice(0, 3) as item}
						<a href="/projects/{item.id}#discussions" class="widget-row-item">
							<div class="widget-avatar-circle">
								{#if item.creatorAvatarUrl}
									<img src={item.creatorAvatarUrl} alt={item.creatorName} />
								{:else}
									<span>{getInitials(item.creatorName)}</span>
								{/if}
							</div>
							<div class="widget-row-text">
								<h4 class="widget-row-title">{item.name}</h4>
								<p class="widget-row-sub">
									{item.description ? item.description.slice(0, 48) + '...' : 'Open project discussion'}
								</p>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Activity Widget -->
		<div class="widget-card card">
			<div class="widget-header">
				<div class="widget-title-wrap">
					<span class="widget-icon purple">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
					</span>
					<h3 class="widget-title">Activity</h3>
				</div>
				<a href="/positions/my-applications" class="widget-link purple">View All</a>
			</div>

			<div class="widget-list">
				{#if myApplications.length === 0 && myJoinRequests.length === 0}
					<p class="widget-empty">No recent applications or join requests yet.</p>
				{:else}
					{#each myJoinRequests.slice(0, 3) as req}
						<a href="/projects/{req.projectId}" class="widget-row-item">
							<div class="widget-avatar-circle purple">
								<span>{getInitials(profile?.fullName)}</span>
							</div>
							<div class="widget-row-text">
								<p class="widget-activity-copy">
									Requested to join <strong>{req.projectName || 'a project'}</strong>
								</p>
								<span class="widget-time">{new Date(req.createdAt).toLocaleDateString()}</span>
							</div>
						</a>
					{/each}
					{#each myApplications.slice(0, 2) as app}
						<a href="/positions/my-applications" class="widget-row-item">
							<div class="widget-avatar-circle purple">
								<span>{getInitials(profile?.fullName)}</span>
							</div>
							<div class="widget-row-text">
								<p class="widget-activity-copy">
									Applied for <strong>{app.positionTitle}</strong>
								</p>
								<span class="widget-time">{new Date(app.createdAt).toLocaleDateString()}</span>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</div>

		<!-- My Teams Widget -->
		<div class="widget-card card">
			<div class="widget-header">
				<div class="widget-title-wrap">
					<span class="widget-icon green">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
					</span>
					<h3 class="widget-title">My Teams</h3>
				</div>
				<a href="/teams" class="widget-link green">View All</a>
			</div>

			<div class="widget-tabs-row">
				<button
					type="button"
					class="widget-tab-btn"
					class:active={groupFilterTab === 'active'}
					onclick={() => (groupFilterTab = 'active')}
				>
					Active
				</button>
				<button
					type="button"
					class="widget-tab-btn"
					class:active={groupFilterTab === 'newest'}
					onclick={() => (groupFilterTab = 'newest')}
				>
					Newest
				</button>
			</div>

			<div class="widget-list">
				{#if filteredGroups.length === 0}
					<p class="widget-empty">No active project teams yet.</p>
				{:else}
					{#each filteredGroups.slice(0, 3) as proj}
						<a href="/projects/{proj.id}" class="widget-row-item">
							<div class="widget-avatar-circle green">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
							</div>
							<div class="widget-row-text">
								<h4 class="widget-row-title">{proj.name}</h4>
								<span class="widget-time">{proj.members?.length || 1} members</span>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</div>
	</aside>
</div>

<style>
	.dashboard-layout {
		display: grid;
		grid-template-columns: 1fr 310px;
		gap: 24px;
		align-items: start;
	}

	.dashboard-main-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	/* Welcome Hero Banner */
	.welcome-hero-card {
		background: linear-gradient(125deg, #f0f7ff 0%, #dcecff 58%, #cae2ff 100%);
		border: 1px solid #d5e6fc;
		border-radius: 20px;
		padding: 26px 30px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: relative;
		overflow: hidden;
		box-shadow: 0 4px 18px rgba(29, 114, 254, 0.06);
	}

	.hero-left {
		display: flex;
		align-items: center;
		gap: 22px;
		position: relative;
		z-index: 2;
	}

	.avatar-ring-wrap {
		position: relative;
		width: 88px;
		height: 88px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.progress-ring-svg {
		position: absolute;
		inset: 0;
	}

	.hero-avatar-inner {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		background: linear-gradient(135deg, #2563eb, #1d72fe);
		color: #ffffff;
		font-size: 1.25rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 3px solid #ffffff;
		box-shadow: 0 4px 12px rgba(29, 114, 254, 0.22);
	}
	.hero-avatar-inner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.hero-completion-text {
		font-size: 0.75rem;
		color: #2563eb;
		font-weight: 500;
	}

	.hero-greeting {
		font-size: 1.5rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
		line-height: 1.2;
	}
	.hero-greeting span {
		font-weight: 800;
	}

	.hero-sub {
		font-size: 0.875rem;
		color: #475569;
		margin: 0 0 10px 0;
	}

	.hero-cta-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.hero-outline-btn {
		padding: 8px 16px;
		border-radius: 9999px;
		border: 1.5px solid #60a5fa;
		background: rgba(255, 255, 255, 0.85);
		color: #1d72fe;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.16s ease;
	}
	.hero-outline-btn:hover {
		background: #ffffff;
		border-color: #1d72fe;
		text-decoration: none;
	}

	.hero-primary-btn {
		padding: 8px 18px;
		border-radius: 9999px;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(29, 114, 254, 0.28);
		transition: background 0.16s ease;
	}
	.hero-primary-btn:hover {
		background: #155bd5;
		text-decoration: none;
	}

	.hero-geo-decor {
		position: relative;
		width: 140px;
		height: 90px;
		flex-shrink: 0;
	}
	.geo-circle {
		position: absolute;
		border-radius: 50%;
	}
	.geo-1 {
		width: 64px;
		height: 64px;
		background: rgba(96, 165, 250, 0.25);
		right: 10px;
		top: 0;
	}
	.geo-2 {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(29, 114, 254, 0.25);
		right: 68px;
		bottom: 4px;
	}
	.geo-triangle {
		position: absolute;
		right: 4px;
		bottom: -6px;
		width: 0;
		height: 0;
		border-left: 28px solid transparent;
		border-right: 28px solid transparent;
		border-bottom: 48px solid rgba(59, 130, 246, 0.24);
	}

	/* 4 Pastel Stat Cards */
	.stats-metrics-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.stat-metric-card {
		border-radius: 16px;
		padding: 16px 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		text-decoration: none;
		border: 1px solid rgba(255, 255, 255, 0.9);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.stat-metric-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
		text-decoration: none;
	}

	.tint-peach { background: #fff4ed; }
	.tint-blue { background: #eff6ff; }
	.tint-mint { background: #ecfdf5; }
	.tint-lavender { background: #f5f3ff; }

	.stat-icon-box {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.stat-icon-box.orange { background: #ffedd5; color: #ea580c; }
	.stat-icon-box.blue { background: #dbeafe; color: #2563eb; }
	.stat-icon-box.green { background: #dcfce7; color: #16a34a; }
	.stat-icon-box.purple { background: #ede9fe; color: #9333ea; }

	.stat-text {
		display: flex;
		flex-direction: column;
	}
	.stat-count {
		font-size: 1.375rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
	}
	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #64748b;
		margin-top: 2px;
	}

	/* White Content Cards */
	.section-card {
		padding: 22px 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid #e6edf5;
	}

	.section-header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin-bottom: 18px;
	}
	.wrap-toolbar {
		flex-wrap: wrap;
	}

	.section-title-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.section-icon {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.section-icon.blue {
		background: #eff6ff;
		color: #1d72fe;
	}

	.section-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.section-tabs-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tab-pill-btn {
		padding: 5px 12px;
		border-radius: 8px;
		border: none;
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
	}
	.tab-pill-btn.active {
		color: #1d72fe;
		background: #eff6ff;
	}

	.section-see-all {
		font-size: 0.75rem;
		font-weight: 600;
		color: #1d72fe;
		margin-left: 6px;
		text-decoration: none;
	}
	.section-see-all:hover {
		text-decoration: underline;
	}

	/* Members Carousel Row */
	.members-carousel-row {
		display: flex;
		gap: 14px;
		overflow-x: auto;
		padding-bottom: 4px;
	}

	.member-card-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 14px 12px;
		min-width: 112px;
		border-radius: 14px;
		border: 1px solid #f1f5f9;
		background: #fafcff;
		text-decoration: none;
		transition: border-color 0.15s ease, transform 0.15s ease;
	}
	.member-card-item:hover {
		border-color: #bfdbfe;
		transform: translateY(-2px);
		text-decoration: none;
	}

	.member-avatar-wrap {
		position: relative;
	}
	.member-avatar-circle {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #1d72fe);
		color: #ffffff;
		font-weight: 700;
		font-size: 0.9375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.member-avatar-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.online-dot {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: #10b981;
		border: 2px solid #ffffff;
	}

	.member-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #1e293b;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100px;
	}

	.members-loading-row {
		display: flex;
		gap: 14px;
	}
	.member-circle-skeleton {
		width: 112px;
		height: 108px;
		border-radius: 14px;
	}

	/* Projects Toolbar */
	.projects-toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.search-mini-box {
		position: relative;
		display: flex;
		align-items: center;
	}
	.search-mini-icon {
		position: absolute;
		left: 10px;
		color: #94a3b8;
		pointer-events: none;
	}
	.search-mini-input {
		height: 34px;
		width: 170px;
		border-radius: 9px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		padding: 0 10px 0 30px;
		font-size: 0.8125rem;
		color: #0f172a;
		outline: none;
	}
	.search-mini-input:focus {
		border-color: #1d72fe;
		background: #ffffff;
	}

	.toolbar-select {
		height: 34px;
		border-radius: 9px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		padding: 0 10px;
		font-size: 0.8125rem;
		color: #475569;
		outline: none;
	}

	.view-toggle-group {
		display: flex;
		border: 1px solid #e2e8f0;
		border-radius: 9px;
		overflow: hidden;
	}
	.view-toggle-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: #ffffff;
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.view-toggle-btn.active {
		background: #eff6ff;
		color: #1d72fe;
	}

	/* Projects Grid */
	.projects-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.projects-grid.list-layout {
		grid-template-columns: 1fr;
	}

	.project-card {
		border-radius: 16px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		text-decoration: none;
		transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
	}
	.project-card:hover {
		transform: translateY(-2px);
		border-color: #93c5fd;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
		text-decoration: none;
	}

	.project-cover {
		height: 92px;
		padding: 12px 14px;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}
	.cover-domain-tag {
		background: rgba(255, 255, 255, 0.22);
		color: #ffffff;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 9999px;
	}
	.cover-action-pill {
		background: rgba(255, 255, 255, 0.94);
		color: #1d72fe;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 9999px;
	}

	.project-body {
		padding: 14px 16px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}
	.project-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}
	.project-summary {
		font-size: 0.78125rem;
		color: #64748b;
		line-height: 1.4;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.capacity-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.71875rem;
		color: #64748b;
		margin-top: 4px;
	}
	.capacity-pct {
		font-weight: 700;
		color: #1d72fe;
	}
	.capacity-bar {
		height: 6px;
		border-radius: 9999px;
		background: #f1f5f9;
		overflow: hidden;
	}
	.capacity-fill {
		height: 100%;
		border-radius: 9999px;
		background: #1d72fe;
	}

	.project-meta-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: auto;
		padding-top: 6px;
	}
	.meta-chip {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 6px;
	}
	.meta-chip.orange { background: #fff7ed; color: #ea580c; }
	.meta-chip.green { background: #f0fdf4; color: #16a34a; }
	.meta-chip.purple { background: #faf5ff; color: #9333ea; }

	.project-card-skeleton {
		height: 230px;
		border-radius: 16px;
	}

	/* Empty States */
	.empty-inline-state,
	.empty-projects-box {
		padding: 28px 16px;
		text-align: center;
		color: #64748b;
		font-size: 0.875rem;
	}
	.empty-cta-row {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-top: 14px;
	}
	.btn-primary-sm {
		padding: 8px 16px;
		border-radius: 10px;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
	}
	.btn-outline-sm {
		padding: 8px 16px;
		border-radius: 10px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
	}

	/* Right Column Widgets */
	.dashboard-right-col {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.widget-card {
		padding: 18px 20px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid #e6edf5;
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.widget-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.widget-icon {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.widget-icon.blue { background: #eff6ff; color: #2563eb; }
	.widget-icon.purple { background: #faf5ff; color: #9333ea; }
	.widget-icon.green { background: #f0fdf4; color: #16a34a; }

	.widget-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.widget-link {
		font-size: 0.75rem;
		font-weight: 600;
		text-decoration: none;
	}
	.widget-link.blue { color: #2563eb; }
	.widget-link.purple { color: #9333ea; }
	.widget-link.green { color: #16a34a; }

	.widget-tabs-row {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
	}
	.widget-tab-btn {
		padding: 4px 10px;
		border-radius: 6px;
		border: none;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.widget-tab-btn.active {
		background: #dcfce7;
		color: #15803d;
	}

	.widget-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.widget-row-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 12px;
		background: #f8fafc;
		text-decoration: none;
		transition: background 0.15s ease;
	}
	.widget-row-item:hover {
		background: #eff6ff;
		text-decoration: none;
	}

	.widget-avatar-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #dbeafe;
		color: #1d72fe;
		font-size: 0.75rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		overflow: hidden;
	}
	.widget-avatar-circle.purple { background: #ede9fe; color: #9333ea; }
	.widget-avatar-circle.green { background: #dcfce7; color: #16a34a; }
	.widget-avatar-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.widget-row-text {
		min-width: 0;
		flex: 1;
	}
	.widget-row-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.widget-row-sub,
	.widget-activity-copy {
		font-size: 0.75rem;
		color: #64748b;
		margin: 0;
		line-height: 1.35;
	}
	.widget-time {
		font-size: 0.6875rem;
		color: #94a3b8;
	}
	.widget-empty {
		font-size: 0.8125rem;
		color: #94a3b8;
		margin: 4px 0;
	}

	/* Responsive Breakpoints */
	@media (max-width: 1120px) {
		.dashboard-layout {
			grid-template-columns: 1fr;
		}
		.projects-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 720px) {
		.stats-metrics-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.projects-grid {
			grid-template-columns: 1fr;
		}
		.hero-left {
			flex-direction: column;
			align-items: flex-start;
		}
		.hero-geo-decor {
			display: none;
		}
	}
</style>
