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

	// Real data state
	let recentStudents = $state<StudentProfile[]>([]);
	let loadingStudents = $state(true);
	let myProjects = $state<ProjectDetail[]>([]);
	let exploreProjects = $state<ProjectDetail[]>([]);
	let loadingProjects = $state(true);
	let myApplications = $state<ApplicationDetail[]>([]);
	let myJoinRequests = $state<JoinRequestDetail[]>([]);

	// Filters & search on dashboard project grid
	let projectSearchQuery = $state('');
	let selectedCategory = $state('All Categories');
	let selectedSort = $state('Alphabetical');
	let viewMode = $state<'grid' | 'list'>('grid');
	let memberFilterTab = $state<'active' | 'popular' | 'newest'>('active');
	let groupFilterTab = $state<'active' | 'popular' | 'newest'>('active');

	const profile = $derived($currentProfile);
	const user = $derived($currentUser);

	// Calculate profile completeness %
	const profileCompleteness = $derived.by(() => {
		if (!profile) return 20;
		let score = 20; // base registered
		if (profile.fullName) score += 20;
		if (profile.headline) score += 15;
		if (profile.bio) score += 15;
		if (profile.avatarUrl) score += 15;
		if (profile.skills && profile.skills.length > 0) score += 15;
		return Math.min(score, 100);
	});

	onMount(async () => {
		try {
			const [uRes, pMyRes, pListRes, appsRes, reqsRes] = await Promise.all([
				usersApi.search({ limit: 10 }).catch(() => null),
				projectsApi.getMyProjects().catch(() => null),
				projectsApi.list({ limit: 6 }).catch(() => null),
				positionsApi.getMyApplications().catch(() => null),
				projectsApi.getMySentJoinRequests().catch(() => null),
			]);

			if (uRes) recentStudents = uRes.data ?? [];
			if (pMyRes) myProjects = pMyRes.data ?? [];
			if (pListRes) exploreProjects = pListRes.data ?? [];
			if (appsRes) myApplications = appsRes.data ?? [];
			if (reqsRes) myJoinRequests = reqsRes.data ?? [];
		} catch {
			// Non-critical: Dashboard gracefully renders real loaded state
		} finally {
			loadingStudents = false;
			loadingProjects = false;
		}
	});

	function getInitials(name: string): string {
		if (!name) return 'CS';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	// Filtered projects for the dashboard grid
	const filteredDashboardProjects = $derived.by(() => {
		let list = exploreProjects.length > 0 ? exploreProjects : myProjects;
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
			list = [...list].sort((a, b) => a.name.localeCompare(b.name));
		}
		return list;
	});

	// Domain illustration gradient theme
	function getDomainGradient(domain?: string | null): string {
		const d = (domain || '').toLowerCase();
		if (d.includes('ai') || d.includes('ml')) {
			return 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)';
		}
		if (d.includes('web') || d.includes('full')) {
			return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
		}
		if (d.includes('cloud') || d.includes('devops')) {
			return 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)';
		}
		if (d.includes('mobile')) {
			return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
		}
		return 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)';
	}
</script>

<svelte:head>
	<title>Member Dashboard — CollabSphere</title>
</svelte:head>

<div class="dashboard-container">
	<!-- Top Liquid Glass Workspace Row (exact matching Screenshot 4) -->
	<div class="liquid-glass-stage">
		<!-- Left / Center: 6 Volumetric 3D Pastel Cards (Screenshot 4) -->
		<div class="volumetric-cards-grid">
			<!-- Card 1: Lavender (Projects) -->
			<a href="/projects" class="pastel-card card-lavender" title="View Active Projects">
				<div class="card-3d-visual">
					<div class="pill-3d-badge lavender">
						<span class="badge-capsule"></span>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Projects</span>
					<span class="card-count-sub">{myProjects.length + exploreProjects.length} Active</span>
				</div>
			</a>

			<!-- Card 2: Lilac (Team) -->
			<a href="/teams" class="pastel-card card-lilac" title="My Team Collaborations">
				<div class="card-3d-visual">
					<div class="sheet-3d-badge lilac">
						<span class="sheet-line line-1"></span>
						<span class="sheet-line line-2"></span>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Team</span>
					<span class="card-count-sub">{recentStudents.length} Peers</span>
				</div>
			</a>

			<!-- Card 3: Blush Pink (Milestones & Invoices / Tasks) -->
			<a href="/positions" class="pastel-card card-pink" title="Milestones & Open Roles">
				<div class="card-3d-visual">
					<div class="capsule-3d-badge pink">
						<span class="cap-half cap-left"></span>
						<span class="cap-half cap-right"></span>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Invoices & Tasks</span>
					<span class="card-count-sub">{myProjects.length} Sprints</span>
				</div>
			</a>

			<!-- Card 4: Mint Green (Reports & Applications) -->
			<a href="/positions/my-applications" class="pastel-card card-mint" title="My Collaboration Applications">
				<div class="card-3d-visual">
					<div class="sheet-3d-badge mint">
						<span class="sheet-line line-1"></span>
						<span class="sheet-line line-2"></span>
						<span class="sheet-line line-3"></span>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Reports</span>
					<span class="card-count-sub">{myApplications.length + myJoinRequests.length} Requests</span>
				</div>
			</a>

			<!-- Card 5: Soft Teal / Seafoam (Discussions & Team) -->
			<a href="/projects#discussions" class="pastel-card card-teal" title="Project Discussions">
				<div class="card-3d-visual">
					<div class="sheet-3d-badge teal">
						<span class="sheet-line line-1"></span>
						<span class="sheet-line line-2"></span>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Team Forums</span>
					<span class="card-count-sub">{exploreProjects.length} Topics</span>
				</div>
			</a>

			<!-- Card 6: Apricot Peach (Preferences & Profile) -->
			<a href="/profile/edit" class="pastel-card card-peach" title="Edit Profile & Preferences">
				<div class="card-3d-visual">
					<div class="circle-3d-badge peach">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
					</div>
				</div>
				<div class="card-meta-bottom">
					<span class="card-title-text">Preferences</span>
					<span class="card-count-sub">{profileCompleteness}% Complete</span>
				</div>
			</a>
		</div>

		<!-- Right Side Widgets (Screenshot 4) -->
		<div class="liquid-right-col">
			<!-- Donut Completion Ring Card -->
			<div class="ring-widget-card">
				<div class="donut-chart-container">
					<svg width="120" height="120" viewBox="0 0 120 120">
						<!-- Segment 1: Lavender / Purple -->
						<circle cx="60" cy="60" r="46" stroke="#c084fc" stroke-width="12" fill="none" stroke-dasharray="72 217" stroke-dashoffset="0" />
						<!-- Segment 2: Peach / Orange -->
						<circle cx="60" cy="60" r="46" stroke="#fb923c" stroke-width="12" fill="none" stroke-dasharray="72 217" stroke-dashoffset="-72" />
						<!-- Segment 3: Mint / Green -->
						<circle cx="60" cy="60" r="46" stroke="#4ade80" stroke-width="12" fill="none" stroke-dasharray="72 217" stroke-dashoffset="-144" />
						<!-- Segment 4: Cyan / Blue -->
						<circle cx="60" cy="60" r="46" stroke="#38bdf8" stroke-width="12" fill="none" stroke-dasharray="73 217" stroke-dashoffset="-216" />
					</svg>
					<div class="donut-center-text">
						<span class="donut-bold-num">{Math.min(5, Math.max(1, Math.round(profileCompleteness / 20)))}</span>
					</div>
				</div>
				<span class="donut-step-label">Step {Math.min(5, Math.max(1, Math.round(profileCompleteness / 20)))} of 5</span>
			</div>

			<!-- Step Checklist / Accordion Card -->
			<div class="step-accordion-card">
				<div class="step-item-row next-step">
					<span class="step-indicator-badge orange">1</span>
					<span class="step-name">Next</span>
					<span class="step-range-tag">1-10</span>
				</div>
				<div class="step-item-row prev-step">
					<span class="step-indicator-dot gray"></span>
					<span class="step-name">Previous</span>
					<span class="step-chevron">▾</span>
				</div>
				<div class="step-item-row prev-step active-step">
					<span class="step-indicator-dot green"></span>
					<span class="step-name">Previous</span>
					<span class="step-chevron">▾</span>
				</div>
				<div class="step-item-row prev-step">
					<span class="step-indicator-dot gray"></span>
					<span class="step-name">Project</span>
					<span class="step-chevron">▾</span>
				</div>

				<div class="step-page-switch-pill">
					<span>Page Switch</span>
					<span class="switch-arrow">▾</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Bottom Floating Control Dock (Screenshot 4) -->
	<div class="bottom-floating-dock-row">
		<div class="floating-glass-dock">
			<a href="/dashboard" class="dock-icon-btn active" title="Dashboard Home">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
			</a>
			<a href="/projects" class="dock-icon-btn" title="Explore Projects">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
			</a>
			<a href="/positions/my-applications" class="dock-icon-btn" title="My Applications">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
			</a>
			<a href="/projects/new" class="dock-coral-action-btn">
				+ New Project
			</a>
		</div>
	</div>

	<!-- Main Left/Center Column -->
	<div class="center-content-column">

		<!-- Members / Peers Section (matching Screenshot 2) -->
		<section class="dashboard-section-card card">
			<div class="section-card-header">
				<div class="section-title-wrap">
					<span class="section-icon blue">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
					</span>
					<h2 class="section-heading">Members</h2>
				</div>
				<div class="section-tabs-row">
					<button
						class="tab-pill-btn"
						class:active={memberFilterTab === 'active'}
						onclick={() => (memberFilterTab = 'active')}
					>
						Active
					</button>
					<button
						class="tab-pill-btn"
						class:active={memberFilterTab === 'popular'}
						onclick={() => (memberFilterTab = 'popular')}
					>
						Popular
					</button>
					<button
						class="tab-pill-btn"
						class:active={memberFilterTab === 'newest'}
						onclick={() => (memberFilterTab = 'newest')}
					>
						Newest
					</button>
				</div>
			</div>

			{#if loadingStudents}
				<div class="members-loading-row">
					{#each Array(6) as _}
						<div class="skeleton member-circle-skeleton"></div>
					{/each}
				</div>
			{:else if recentStudents.length === 0}
				<p class="empty-state-text">No active members found yet. Connect with students to collaborate!</p>
			{:else}
				<div class="members-carousel-row">
					{#each recentStudents.slice(0, 7) as student}
						<a href="/profile/{student.username}" class="member-profile-circle-card" title={student.fullName}>
							<div class="member-circle-wrap">
								<div class="member-avatar-img">
									{#if student.avatarUrl}
										<img src={student.avatarUrl} alt={student.fullName} />
									{:else}
										<span class="member-avatar-fallback">{getInitials(student.fullName)}</span>
									{/if}
								</div>
								<span class="online-indicator-dot" title="Active"></span>
							</div>
							<span class="member-name-label">{student.fullName.split(' ').slice(0, 2).join(' ')}</span>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Courses / Projects Grid Section (matching Screenshot 2) -->
		<section class="dashboard-section-card card">
			<div class="section-card-header flex-between">
				<div class="section-title-wrap">
					<span class="section-icon blue">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
					</span>
					<h2 class="section-heading">Courses & Projects</h2>
				</div>

				<div class="controls-toolbar-row">
					<div class="search-mini-wrap">
						<svg class="search-mini-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input
							type="text"
							class="search-mini-input"
							placeholder="Search Projects..."
							bind:value={projectSearchQuery}
						/>
					</div>

					<select bind:value={selectedSort} class="toolbar-select">
						<option value="Alphabetical">Alphabetical</option>
						<option value="Recent">Newest First</option>
					</select>

					<select bind:value={selectedCategory} class="toolbar-select">
						<option value="All Categories">All Categories</option>
						<option value="Web Dev">Web Dev</option>
						<option value="AI/ML">AI/ML</option>
						<option value="Mobile">Mobile</option>
						<option value="Cloud">Cloud/DevOps</option>
					</select>

					<div class="view-toggle-btns">
						<button
							class="view-toggle-btn"
							class:active={viewMode === 'grid'}
							onclick={() => (viewMode = 'grid')}
							aria-label="Grid view"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
						</button>
						<button
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

			<!-- Project Cards Grid -->
			{#if loadingProjects}
				<div class="projects-dashboard-grid">
					{#each Array(3) as _}
						<div class="skeleton project-card-skeleton"></div>
					{/each}
				</div>
			{:else if filteredDashboardProjects.length === 0}
				<div class="empty-projects-state">
					<p>No projects match your filter.</p>
					<a href="/projects/new" class="create-first-btn">+ Start a Project</a>
				</div>
			{:else}
				<div class="projects-dashboard-grid {viewMode === 'list' ? 'list-layout' : ''}">
					{#each filteredDashboardProjects.slice(0, 6) as proj}
						<a href="/projects/{proj.id}" class="project-grid-card">
							<!-- Card Cover Top -->
							<div class="card-cover-banner" style="background: {getDomainGradient(proj.domain)}">
								<span class="cover-domain-tag">{proj.domain || 'Project'}</span>
								<span class="cover-start-badge">START COURSE</span>
							</div>

							<!-- Card Info -->
							<div class="card-body-content">
								<h3 class="card-proj-title">{proj.name}</h3>

								<div class="rating-stars-row">
									<span class="star filled">★</span>
									<span class="star filled">★</span>
									<span class="star filled">★</span>
									<span class="star filled">★</span>
									<span class="star filled">★</span>
									<span class="rating-text">(5.0)</span>
									<span class="progress-percent">
										{Math.min(100, Math.round(((proj.members?.length || 1) / (proj.teamSize || 4)) * 100))}%
									</span>
								</div>

								<div class="project-capacity-bar-wrap">
									<div
										class="capacity-fill"
										style="width: {Math.min(100, Math.round(((proj.members?.length || 1) / (proj.teamSize || 4)) * 100))}%"
									></div>
								</div>

								<div class="card-meta-indicators">
									<span class="meta-item-box orange">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
										{proj.teamSize || 4} Members
									</span>
									<span class="meta-item-box green">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
										{proj.skills?.length || 1} Skills
									</span>
									<span class="meta-item-box purple">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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

	<!-- Right Column: Sidebar Widgets (matching Screenshot 2) -->
	<aside class="right-widgets-column">
		<!-- Forums Widget -->
		<div class="widget-card card">
			<div class="widget-header">
				<div class="widget-title-wrap">
					<span class="widget-icon blue">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
					</span>
					<h3 class="widget-title">Forums</h3>
				</div>
				<a href="/projects#discussions" class="widget-see-all blue">See All</a>
			</div>

			<div class="widget-items-list">
				{#if exploreProjects.length === 0}
					<p class="widget-empty">No forum discussions yet.</p>
				{:else}
					{#each exploreProjects.slice(0, 3) as item}
						<a href="/projects/{item.id}#discussions" class="forum-item-row">
							<div class="item-avatar-circle">
								{#if item.creatorAvatarUrl}
									<img src={item.creatorAvatarUrl} alt={item.creatorName} />
								{:else}
									<span>{getInitials(item.creatorName)}</span>
								{/if}
							</div>
							<div class="forum-item-info">
								<h4 class="forum-item-title">{item.name}</h4>
								<p class="forum-item-snippet">
									{item.description ? item.description.slice(0, 48) + '...' : 'Open collaboration thread for project contributors...'}
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
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
					</span>
					<h3 class="widget-title">Activity</h3>
				</div>
				<a href="/positions/my-applications" class="widget-see-all purple">See All</a>
			</div>

			<div class="widget-items-list">
				{#if myApplications.length === 0 && myJoinRequests.length === 0}
					<div class="activity-item-row">
						<div class="item-avatar-circle purple">
							<span>{profile ? getInitials(profile.fullName) : 'CS'}</span>
						</div>
						<div class="activity-item-info">
							<p class="activity-text">
								<strong>{profile?.fullName?.split(' ')[0] || 'You'}</strong> registered on CollabSphere
							</p>
							<span class="activity-time">Active now</span>
						</div>
					</div>
				{:else}
					{#each myJoinRequests.slice(0, 3) as req}
						<div class="activity-item-row">
							<div class="item-avatar-circle purple">
								<span>{profile ? getInitials(profile.fullName) : 'CS'}</span>
							</div>
							<div class="activity-item-info">
								<p class="activity-text">
									<strong>{profile?.fullName?.split(' ')[0] || 'You'}</strong> requested to join {req.projectName || 'a project'}
								</p>
								<span class="activity-time">{new Date(req.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Groups Widget -->
		<div class="widget-card card">
			<div class="widget-header">
				<div class="widget-title-wrap">
					<span class="widget-icon green">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
					</span>
					<h3 class="widget-title">Groups</h3>
				</div>
				<a href="/discover" class="widget-see-all green">See All</a>
			</div>

			<div class="widget-tabs-row">
				<button
					class="widget-tab-btn"
					class:active={groupFilterTab === 'active'}
					onclick={() => (groupFilterTab = 'active')}
				>
					Active
				</button>
				<button
					class="widget-tab-btn"
					class:active={groupFilterTab === 'popular'}
					onclick={() => (groupFilterTab = 'popular')}
				>
					Popular
				</button>
				<button
					class="widget-tab-btn"
					class:active={groupFilterTab === 'newest'}
					onclick={() => (groupFilterTab = 'newest')}
				>
					Newest
				</button>
			</div>

			<div class="widget-items-list">
				{#if myProjects.length === 0}
					<div class="group-item-row">
						<div class="group-icon-circle green">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
						</div>
						<div class="group-item-info">
							<h4 class="group-item-name">CollabSphere Cohort</h4>
							<span class="group-status-time">active now</span>
						</div>
					</div>
				{:else}
					{#each myProjects.slice(0, 3) as proj}
						<a href="/projects/{proj.id}" class="group-item-row">
							<div class="group-icon-circle green">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
							</div>
							<div class="group-item-info">
								<h4 class="group-item-name">{proj.name}</h4>
								<span class="group-status-time">{proj.members?.length || 1} members active</span>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</div>
	</aside>
</div>

<style>
	.dashboard-container {
		display: flex;
		flex-direction: column;
		gap: 28px;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Top Liquid Glass Workspace Row (Screenshot 4) */
	.liquid-glass-stage {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 24px;
		align-items: stretch;
	}

	/* 6 Volumetric 3D Pastel Cards Grid (Screenshot 4) */
	.volumetric-cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.pastel-card {
		border-radius: 20px;
		padding: 22px 18px 18px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 140px;
		text-decoration: none;
		position: relative;
		overflow: hidden;
		transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.95);
	}
	.pastel-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.95);
	}

	.card-lavender { background: linear-gradient(135deg, #eaeafb 0%, #dedef8 100%); }
	.card-lilac { background: linear-gradient(135deg, #eeebf8 0%, #e3def2 100%); }
	.card-pink { background: linear-gradient(135deg, #fdeef1 0%, #f9e2e6 100%); }
	.card-mint { background: linear-gradient(135deg, #e3f8eb 0%, #d5f2df 100%); }
	.card-teal { background: linear-gradient(135deg, #e0f5f2 0%, #d0eee9 100%); }
	.card-peach { background: linear-gradient(135deg, #fff0e6 0%, #fae2d4 100%); }

	.card-3d-visual {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-height: 48px;
	}

	/* 3D Skeuomorphic Badges (Screenshot 4) */
	.pill-3d-badge {
		width: 44px;
		height: 24px;
		border-radius: 9999px;
		background: #8b5cf6;
		box-shadow: 0 4px 10px rgba(139, 92, 246, 0.35), inset 0 2px 2px rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		padding: 3px;
	}
	.pill-3d-badge.lavender {
		background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
	}

	.sheet-3d-badge {
		width: 36px;
		height: 38px;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		padding: 6px 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.9);
	}
	.sheet-3d-badge.lilac { background: #ffffff; border: 1px solid #e2e8f0; }
	.sheet-3d-badge.mint { background: #ffffff; border: 1px solid #d1fae5; }
	.sheet-3d-badge.teal { background: #ffffff; border: 1px solid #ccfbf1; }

	.sheet-line {
		height: 3px;
		border-radius: 9999px;
		background: #cbd5e1;
	}
	.sheet-3d-badge.mint .sheet-line { background: #34d399; }
	.sheet-3d-badge.teal .sheet-line { background: #2dd4bf; }
	.line-1 { width: 80%; }
	.line-2 { width: 55%; }
	.line-3 { width: 65%; }

	/* Dual-color Capsule (Screenshot 4) */
	.capsule-3d-badge {
		width: 48px;
		height: 24px;
		border-radius: 9999px;
		display: flex;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25), inset 0 2px 3px rgba(255, 255, 255, 0.8);
		transform: rotate(-15deg);
	}
	.cap-half { flex: 1; height: 100%; }
	.cap-left { background: #ff7066; }
	.cap-right { background: #ffffff; }

	.circle-3d-badge {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25), inset 0 2px 2px rgba(255, 255, 255, 0.7);
	}
	.circle-3d-badge.peach { background: #ff7066; }

	.card-meta-bottom {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.card-title-text {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #1e293b;
	}
	.card-count-sub {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
	}

	/* Right Side Widgets (Screenshot 4) */
	.liquid-right-col {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Donut Completion Ring Card */
	.ring-widget-card {
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.donut-chart-container {
		position: relative;
		width: 120px;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.donut-center-text {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.donut-bold-num {
		font-size: 1.75rem;
		font-weight: 800;
		color: #1e293b;
	}
	.donut-step-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #64748b;
	}

	/* Step Checklist / Accordion Card (Screenshot 4) */
	.step-accordion-card {
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.step-item-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 8px;
		border-radius: 8px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #475569;
	}
	.step-indicator-badge {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		font-weight: 700;
		color: #ffffff;
	}
	.step-indicator-badge.orange { background: #fb923c; }
	.step-indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.step-indicator-dot.gray { background: #cbd5e1; }
	.step-indicator-dot.green { background: #10b981; }

	.step-name { flex: 1; }
	.step-range-tag {
		font-size: 0.6875rem;
		color: #94a3b8;
	}
	.step-chevron {
		color: #94a3b8;
		font-size: 0.75rem;
	}

	.step-page-switch-pill {
		margin-top: 6px;
		padding: 6px 14px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
	}

	/* Bottom Floating Glass Dock (Screenshot 4) */
	.bottom-floating-dock-row {
		display: flex;
		justify-content: center;
		margin: 8px 0 16px;
	}
	.floating-glass-dock {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px 6px 18px;
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.95);
		border-radius: 9999px;
		box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.95);
	}
	.dock-icon-btn {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
		text-decoration: none;
		transition: all 0.15s ease;
	}
	.dock-icon-btn:hover { background: #ffffff; color: #ff7066; }
	.dock-icon-btn.active { color: #ff7066; background: #ffe4e2; }

	.dock-coral-action-btn {
		padding: 7px 20px;
		border-radius: 9999px;
		background: linear-gradient(135deg, #ff7e72 0%, #ff5d52 100%);
		color: #ffffff;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 4px 14px rgba(255, 112, 102, 0.38);
		transition: transform 0.15s ease;
	}
	.dock-coral-action-btn:hover { transform: scale(1.03); }

	.center-content-column {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}

	/* Dashboard Sections */
	.dashboard-section-card {
		background: #ffffff;
		border-radius: 24px;
		padding: 24px 28px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(226, 232, 240, 0.7);
	}

	.section-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.section-title-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.section-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.section-icon.blue { color: #1d72fe; }

	.section-heading {
		font-size: 1.25rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.section-tabs-row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.tab-pill-btn {
		background: none;
		border: none;
		font-size: 0.875rem;
		font-weight: 600;
		color: #94a3b8;
		cursor: pointer;
		padding: 4px 0;
		position: relative;
		transition: color 0.15s ease;
	}
	.tab-pill-btn:hover { color: #1e293b; }
	.tab-pill-btn.active {
		color: #1d72fe;
	}
	.tab-pill-btn.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 3px;
		background: #1d72fe;
		border-radius: 9999px;
	}

	/* Members Carousel (matching Screenshot 2) */
	.members-carousel-row {
		display: flex;
		align-items: center;
		gap: 20px;
		overflow-x: auto;
		padding: 8px 4px 12px;
	}

	.member-profile-circle-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		flex-shrink: 0;
		transition: transform 0.15s ease;
	}
	.member-profile-circle-card:hover {
		transform: translateY(-3px);
	}

	.member-circle-wrap {
		position: relative;
		width: 64px;
		height: 64px;
	}

	.member-avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		overflow: hidden;
		background: #eff6ff;
		border: 2px solid #93c5fd;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.member-avatar-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.member-avatar-fallback {
		font-size: 1rem;
		font-weight: 700;
		color: #1d72fe;
	}

	.online-indicator-dot {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #10b981;
		border: 2px solid #ffffff;
	}

	.member-name-label {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #334155;
		white-space: nowrap;
		text-align: center;
		max-width: 76px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.members-loading-row {
		display: flex;
		gap: 20px;
	}
	.member-circle-skeleton {
		width: 64px;
		height: 64px;
		border-radius: 50%;
	}

	/* Controls Toolbar */
	.controls-toolbar-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.search-mini-wrap {
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
		height: 36px;
		border-radius: 9999px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		padding: 0 12px 0 30px;
		font-size: 0.8125rem;
		color: #1e293b;
		outline: none;
	}
	.search-mini-input:focus { border-color: #1d72fe; }

	.toolbar-select {
		height: 36px;
		border-radius: 9999px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		padding: 0 12px;
		font-size: 0.8125rem;
		color: #475569;
		outline: none;
	}

	.view-toggle-btns {
		display: flex;
		align-items: center;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
	}
	.view-toggle-btn {
		background: #ffffff;
		border: none;
		padding: 8px 10px;
		color: #94a3b8;
		cursor: pointer;
		display: flex;
		align-items: center;
	}
	.view-toggle-btn.active {
		background: #eff6ff;
		color: #1d72fe;
	}

	/* Projects Dashboard Grid (matching Screenshot 2) */
	.projects-dashboard-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}

	.project-grid-card {
		background: #ffffff;
		border-radius: 18px;
		overflow: hidden;
		border: 1px solid #e2e8f0;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
		text-decoration: none;
		display: flex;
		flex-direction: column;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.project-grid-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
		border-color: #cbd5e1;
	}

	.card-cover-banner {
		height: 110px;
		padding: 12px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		position: relative;
	}

	.cover-domain-tag {
		background: rgba(255, 255, 255, 0.25);
		color: #ffffff;
		backdrop-filter: blur(4px);
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.cover-start-badge {
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.625rem;
		font-weight: 800;
		padding: 4px 8px;
		border-radius: 6px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.card-body-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.card-proj-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.rating-stars-row {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 0.75rem;
	}
	.star.filled { color: #f59e0b; }
	.rating-text { color: #94a3b8; font-weight: 600; margin-left: 2px; }
	.progress-percent {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 700;
		color: #1d72fe;
	}

	.project-capacity-bar-wrap {
		width: 100%;
		height: 5px;
		border-radius: 9999px;
		background: #eff6ff;
		overflow: hidden;
		margin-bottom: 4px;
	}
	.capacity-fill {
		height: 100%;
		background: #1d72fe;
		border-radius: 9999px;
	}

	.card-meta-indicators {
		display: flex;
		gap: 6px;
		margin-top: auto;
		flex-wrap: wrap;
	}

	.meta-item-box {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 6px;
	}
	.meta-item-box.orange { background: #fff7ed; color: #ea580c; }
	.meta-item-box.green { background: #f0fdf4; color: #16a34a; }
	.meta-item-box.purple { background: #faf5ff; color: #9333ea; }

	.project-card-skeleton {
		height: 220px;
		border-radius: 18px;
	}

	.empty-projects-state {
		padding: 36px;
		text-align: center;
		color: #94a3b8;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.create-first-btn {
		background: #1d72fe;
		color: white;
		padding: 8px 18px;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
	}

	/* Right Widgets Column (matching Screenshot 2) */
	.right-widgets-column {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.widget-card {
		background: #ffffff;
		border-radius: 24px;
		padding: 22px 24px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(226, 232, 240, 0.7);
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.widget-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.widget-icon {
		display: flex;
		align-items: center;
	}

	.widget-title {
		font-size: 1.0625rem;
		font-weight: 800;
		color: #1e293b;
		margin: 0;
	}

	.widget-see-all {
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
	}
	.widget-see-all.blue { color: #1d72fe; }
	.widget-see-all.purple { color: #9333ea; }
	.widget-see-all.green { color: #16a34a; }
	.widget-see-all:hover { text-decoration: underline; }

	.widget-tabs-row {
		display: flex;
		gap: 14px;
		margin-bottom: 14px;
		border-bottom: 1px solid #f1f5f9;
		padding-bottom: 6px;
	}

	.widget-tab-btn {
		background: none;
		border: none;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #94a3b8;
		cursor: pointer;
		padding: 2px 0;
		position: relative;
	}
	.widget-tab-btn.active { color: #16a34a; }
	.widget-tab-btn.active::after {
		content: '';
		position: absolute;
		bottom: -7px;
		left: 0;
		right: 0;
		height: 2px;
		background: #16a34a;
	}

	.widget-items-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.forum-item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px;
		border-radius: 12px;
		text-decoration: none;
		transition: background 0.15s ease;
	}
	.forum-item-row:hover { background: #f8fafc; }

	.item-avatar-circle {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		overflow: hidden;
		background: #e0f2fe;
		color: #0284c7;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.item-avatar-circle.purple { background: #faf5ff; color: #9333ea; }
	.item-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

	.forum-item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.forum-item-title {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.forum-item-snippet {
		font-size: 0.75rem;
		color: #64748b;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.activity-item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 4px;
	}

	.activity-item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.8125rem;
	}
	.activity-text {
		color: #334155;
		margin: 0;
		line-height: 1.3;
	}
	.activity-time {
		font-size: 0.6875rem;
		color: #94a3b8;
	}

	.group-item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 4px;
		text-decoration: none;
	}

	.group-icon-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #f0fdf4;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.group-item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.group-item-name {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.group-status-time {
		font-size: 0.6875rem;
		color: #10b981;
		font-weight: 600;
	}

	.widget-empty {
		font-size: 0.8125rem;
		color: #94a3b8;
		padding: 12px 0;
		margin: 0;
	}

	@media (max-width: 1200px) {
		.dashboard-container {
			grid-template-columns: 1fr;
		}
		.stat-metrics-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.projects-dashboard-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.welcome-hero-card {
			flex-direction: column;
			align-items: flex-start;
			padding: 20px;
		}
		.hero-shapes-decor {
			display: none;
		}
		.stat-metrics-row {
			grid-template-columns: 1fr;
		}
		.projects-dashboard-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
