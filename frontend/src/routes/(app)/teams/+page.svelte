<script lang="ts">
	import { onMount } from 'svelte';
	import {
		projectsApi,
		positionsApi,
		usersApi,
		type ProjectDetail,
		type PositionDetail,
		type ApplicationDetail,
		type StudentProfile,
	} from '$lib/api/client';
	import { currentUser } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';

	let activeTab = $state<'teams' | 'roles' | 'peers'>('teams');

	let myProjects = $state<ProjectDetail[]>([]);
	let allProjects = $state<ProjectDetail[]>([]);
	let openRoles = $state<PositionDetail[]>([]);
	let myApplications = $state<ApplicationDetail[]>([]);
	let peers = $state<StudentProfile[]>([]);
	let loading = $state(true);

	const user = $derived($currentUser);

	onMount(async () => {
		try {
			const [myRes, allRes, rolesRes, appsRes, peersRes] = await Promise.all([
				projectsApi.getMyProjects().catch(() => ({ data: [] })),
				projectsApi.list({ limit: 12 }).catch(() => ({ data: [] })),
				positionsApi.list({ isOpen: true, limit: 8 }).catch(() => ({ data: [] })),
				positionsApi.getMyApplications().catch(() => ({ data: [] })),
				usersApi.search({ limit: 8 }).catch(() => ({ data: [] })),
			]);

			myProjects = myRes.data ?? [];
			allProjects = allRes.data ?? [];
			openRoles = rolesRes.data ?? [];
			myApplications = appsRes.data ?? [];
			peers = peersRes.data ?? [];
		} catch {
			// Graceful fallback
		} finally {
			loading = false;
		}
	});

	// Projects where the current user is either owner or an accepted member
	const collaborativeTeams = $derived.by(() => {
		if (!user) return myProjects;
		return allProjects.filter(
			(p) =>
				p.createdBy === user.id ||
				p.members?.some((m) => m.userId === user.id)
		);
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
</script>

<svelte:head>
	<title>Team Collaboration & Workspaces — CollabSphere</title>
</svelte:head>

<div class="teams-page-container">
	<!-- Top Hero Header -->
	<header class="teams-hero-banner">
		<div class="hero-text-col">
			<span class="hero-category-tag">Team Collaboration</span>
			<h1 class="hero-title">My Teams</h1>
			<p class="hero-subtitle">
				Coordinate project work, connect with fellow student contributors, and manage open team roles.
			</p>
		</div>
		<div class="hero-actions-col">
			<Button href="/projects/new" variant="primary">Create Project</Button>
			<Button href="/positions" variant="outline">Explore Opportunities</Button>
		</div>
	</header>

	<!-- Stat Metrics Row -->
	<div class="teams-metrics-row">
		<div class="metric-card card">
			<div class="metric-icon-circle blue">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
			</div>
			<div class="metric-info">
				<span class="metric-value">{collaborativeTeams.length}</span>
				<span class="metric-label">Active Teams</span>
			</div>
		</div>

		<div class="metric-card card">
			<div class="metric-icon-circle green">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
			</div>
			<div class="metric-info">
				<span class="metric-value">{openRoles.length}</span>
				<span class="metric-label">Open Recruitment Roles</span>
			</div>
		</div>

		<div class="metric-card card">
			<div class="metric-icon-circle orange">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
			</div>
			<div class="metric-info">
				<span class="metric-value">{myApplications.length}</span>
				<span class="metric-label">Applications Submitted</span>
			</div>
		</div>

		<div class="metric-card card">
			<div class="metric-icon-circle purple">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
			</div>
			<div class="metric-info">
				<span class="metric-value">{peers.length}</span>
				<span class="metric-label">Available Peers</span>
			</div>
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="teams-tabs-bar">
		<button
			class="tab-btn"
			class:active={activeTab === 'teams'}
			onclick={() => (activeTab = 'teams')}
		>
			My Active Teams ({collaborativeTeams.length})
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'roles'}
			onclick={() => (activeTab = 'roles')}
		>
			Open Team Roles ({openRoles.length})
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'peers'}
			onclick={() => (activeTab = 'peers')}
		>
			Available Collaborators ({peers.length})
		</button>
	</div>

	<!-- Main Content Area -->
	<main class="teams-main-content">
		{#if loading}
			<div class="teams-grid">
				{#each Array(4) as _}
					<div class="skeleton skeleton-team-card"></div>
				{/each}
			</div>
		{:else if activeTab === 'teams'}
			{#if collaborativeTeams.length === 0}
				<div class="empty-state-card card">
					<div class="empty-icon-wrap">👥</div>
					<h3 class="empty-title">No Active Teams Yet</h3>
					<p class="empty-desc">
						You haven't joined or created a project team yet. Start a new project or explore open roles to collaborate with fellow students.
					</p>
					<div class="empty-actions">
						<Button href="/projects/new" variant="primary">Create Project</Button>
						<Button href="/projects" variant="outline">Explore Projects</Button>
					</div>
				</div>
			{:else}
				<div class="teams-grid">
					{#each collaborativeTeams as project}
						<div class="team-card card">
							<div class="team-card-header">
								<div>
									<span class="team-domain-tag">{project.domain || 'Team Workspace'}</span>
									<h3 class="team-title">{project.name}</h3>
								</div>
								<span class="recruitment-pill {project.recruitmentStatus}">
									{project.recruitmentStatus === 'open' ? 'Recruiting' : 'Closed'}
								</span>
							</div>

							{#if project.tagline}
								<p class="team-tagline">{project.tagline}</p>
							{/if}

							<!-- Team Members Row -->
							<div class="team-members-section">
								<span class="members-title">
									Members ({project.members?.length || 1}/{project.teamSize || 4}):
								</span>
								<div class="member-avatars-row">
									<!-- Lead / Creator Avatar -->
									<div class="member-avatar-chip lead" title="{project.creatorName} (Team Lead)">
										{#if project.creatorAvatarUrl}
											<img src={project.creatorAvatarUrl} alt={project.creatorName} />
										{:else}
											<span>{getInitials(project.creatorName)}</span>
										{/if}
									</div>

									<!-- Additional Members -->
									{#if project.members}
										{#each project.members.filter((m) => m.userId !== project.createdBy) as member}
											<div class="member-avatar-chip" title="{member.fullName} ({member.role})">
												{#if member.avatarUrl}
													<img src={member.avatarUrl} alt={member.fullName} />
												{:else}
													<span>{getInitials(member.fullName)}</span>
												{/if}
											</div>
										{/each}
									{/if}

									<!-- Available Empty Slots -->
									{#if (project.teamSize || 4) > (project.members?.length || 1)}
										<div class="empty-slot-chip" title="Open Slot">
											+
										</div>
									{/if}
								</div>
							</div>

							<!-- Required Skills -->
							{#if project.skills && project.skills.length > 0}
								<div class="skills-tags-row">
									{#each project.skills.slice(0, 4) as skill}
										<span class="skill-tag">{skill}</span>
									{/each}
								</div>
							{/if}

							<!-- Footer Actions -->
							<div class="team-card-footer">
								<a href="/projects/{project.id}" class="workspace-btn">
									View Project
								</a>
								{#if project.createdBy === user?.id}
									<span class="owner-indicator-badge">Lead</span>
								{:else}
									<span class="member-indicator-badge">Member</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

		{:else if activeTab === 'roles'}
			{#if openRoles.length === 0}
				<div class="empty-state-card card">
					<div class="empty-icon-wrap">💼</div>
					<h3 class="empty-title">No Open Recruitment Roles</h3>
					<p class="empty-desc">
						There are currently no active openings posted by student teams. Check back soon or create your own project opening.
					</p>
					<Button href="/projects/new" variant="primary">Create Project</Button>
				</div>
			{:else}
				<div class="roles-grid">
					{#each openRoles as role}
						<div class="role-card card">
							<div class="role-header">
								<div>
									<span class="role-slots-tag">{role.slots - role.filledSlots} opening{role.slots - role.filledSlots === 1 ? '' : 's'}</span>
									<h3 class="role-title">{role.title}</h3>
									{#if role.projectName}
										<span class="role-project-name">for {role.projectName}</span>
									{/if}
								</div>
							</div>
							<p class="role-desc">{role.description}</p>
							<div class="role-skills-row">
								{#each role.requiredSkills as skill}
									<span class="skill-tag required">{skill}</span>
								{/each}
							</div>
							<div class="role-card-footer">
								<Button href="/positions/{role.id}/apply" variant="primary" size="sm">
									Submit Application
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

		{:else if activeTab === 'peers'}
			{#if peers.length === 0}
				<div class="empty-state-card card">
					<div class="empty-icon-wrap">🎓</div>
					<h3 class="empty-title">No Peers Found</h3>
					<p class="empty-desc">No other student profiles are currently active in the directory.</p>
				</div>
			{:else}
				<div class="peers-grid">
					{#each peers as peer}
						<div class="peer-card card">
							<div class="peer-avatar-circle">
								{#if peer.avatarUrl}
									<img src={peer.avatarUrl} alt={peer.fullName} />
								{:else}
									<span>{getInitials(peer.fullName)}</span>
								{/if}
							</div>
							<h3 class="peer-name">{peer.fullName}</h3>
							<p class="peer-username">@{peer.username}</p>
							{#if peer.headline}
								<p class="peer-headline">{peer.headline}</p>
							{/if}
							{#if peer.skills && peer.skills.length > 0}
								<div class="peer-skills-row">
									{#each peer.skills.slice(0, 3) as s}
										<span class="skill-tag">{s.name || s}</span>
									{/each}
								</div>
							{/if}
							<div class="peer-card-footer">
								<a href="/profile/{peer.username}" class="view-profile-btn">
									View Profile
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	.teams-page-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	.teams-hero-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 20px;
		padding: 28px 32px;
		background: linear-gradient(125deg, #f0f7ff 0%, #dcecff 58%, #cae2ff 100%);
		border-radius: 20px;
		border: 1px solid #d5e6fc;
		box-shadow: 0 4px 18px rgba(29, 114, 254, 0.06);
	}

	.hero-category-tag {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #1d72fe;
		margin-bottom: 6px;
		display: inline-block;
	}

	.hero-title {
		font-size: 28px;
		font-weight: 800;
		color: #0f172a;
		letter-spacing: -0.02em;
		margin: 0 0 8px 0;
	}

	.hero-subtitle {
		font-size: 14px;
		color: #64748b;
		max-width: 600px;
		line-height: 1.5;
		margin: 0;
	}

	.hero-actions-col {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	/* Stat Metrics */
	.teams-metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.metric-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid rgba(226, 232, 240, 0.85);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.02);
	}

	.metric-icon-circle {
		width: 46px;
		height: 46px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.metric-icon-circle.blue {
		background: #eff6ff;
		color: #1d72fe;
	}
	.metric-icon-circle.green {
		background: #f0fdf4;
		color: #16a34a;
	}
	.metric-icon-circle.orange {
		background: #fff7ed;
		color: #ea580c;
	}
	.metric-icon-circle.purple {
		background: #faf5ff;
		color: #9333ea;
	}

	.metric-info {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-size: 24px;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
	}

	.metric-label {
		font-size: 12px;
		font-weight: 500;
		color: #64748b;
		margin-top: 4px;
	}

	/* Tabs */
	.teams-tabs-bar {
		display: flex;
		gap: 8px;
		background: #ffffff;
		padding: 6px;
		border-radius: 16px;
		border: 1px solid rgba(226, 232, 240, 0.85);
		width: fit-content;
	}

	.tab-btn {
		padding: 10px 20px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
		color: #64748b;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.tab-btn:hover {
		color: #0f172a;
	}

	.tab-btn.active {
		background: #1d72fe;
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(29, 114, 254, 0.25);
	}

	/* Teams Grid */
	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
	}

	.team-card {
		padding: 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid rgba(226, 232, 240, 0.85);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.team-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}

	.team-domain-tag {
		font-size: 11px;
		font-weight: 700;
		color: #1d72fe;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.team-title {
		font-size: 18px;
		font-weight: 700;
		color: #0f172a;
		margin: 4px 0 0 0;
	}

	.recruitment-pill {
		font-size: 11px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 9999px;
	}

	.recruitment-pill.open {
		background: #dcfce7;
		color: #15803d;
	}

	.recruitment-pill.closed {
		background: #f1f5f9;
		color: #64748b;
	}

	.team-tagline {
		font-size: 13px;
		color: #64748b;
		line-height: 1.45;
		margin: 0;
	}

	.team-members-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.members-title {
		font-size: 12px;
		font-weight: 600;
		color: #475569;
	}

	.member-avatars-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.member-avatar-chip {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		overflow: hidden;
		border: 2px solid #ffffff;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
	}

	.member-avatar-chip.lead {
		border-color: #1d72fe;
	}

	.member-avatar-chip img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.empty-slot-chip {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 2px dashed #cbd5e1;
		color: #94a3b8;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
	}

	.skills-tags-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.skill-tag {
		font-size: 11px;
		font-weight: 600;
		background: #f1f5f9;
		color: #334155;
		padding: 4px 10px;
		border-radius: 8px;
	}

	.skill-tag.required {
		background: #eff6ff;
		color: #1d72fe;
	}

	.team-card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 14px;
		border-top: 1px solid #f1f5f9;
		margin-top: auto;
	}

	.workspace-btn {
		font-size: 13px;
		font-weight: 700;
		color: #1d72fe;
		text-decoration: none;
		transition: transform 0.15s ease;
	}

	.workspace-btn:hover {
		transform: translateX(2px);
	}

	.owner-indicator-badge {
		font-size: 11px;
		font-weight: 700;
		color: #ea580c;
		background: #fff7ed;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.member-indicator-badge {
		font-size: 11px;
		font-weight: 600;
		color: #16a34a;
		background: #f0fdf4;
		padding: 3px 8px;
		border-radius: 6px;
	}

	/* Roles Grid */
	.roles-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
	}

	.role-card {
		padding: 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid rgba(226, 232, 240, 0.85);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.role-slots-tag {
		font-size: 11px;
		font-weight: 700;
		color: #16a34a;
		background: #dcfce7;
		padding: 3px 8px;
		border-radius: 6px;
		display: inline-block;
		margin-bottom: 6px;
	}

	.role-title {
		font-size: 18px;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.role-project-name {
		font-size: 12px;
		color: #64748b;
	}

	.role-desc {
		font-size: 13px;
		color: #475569;
		line-height: 1.5;
		margin: 0;
	}

	.role-skills-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.role-card-footer {
		margin-top: auto;
		padding-top: 12px;
	}

	/* Peers Grid */
	.peers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 20px;
	}

	.peer-card {
		padding: 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid rgba(226, 232, 240, 0.85);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
	}

	.peer-avatar-circle {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		font-weight: 700;
		color: #334155;
		overflow: hidden;
		margin-bottom: 4px;
	}

	.peer-avatar-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.peer-name {
		font-size: 16px;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.peer-username {
		font-size: 12px;
		color: #64748b;
		margin: 0;
	}

	.peer-headline {
		font-size: 12px;
		color: #475569;
		margin: 0;
		line-height: 1.4;
	}

	.peer-skills-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		margin-top: 4px;
	}

	.peer-card-footer {
		margin-top: auto;
		width: 100%;
		padding-top: 12px;
	}

	.view-profile-btn {
		display: block;
		width: 100%;
		padding: 8px 16px;
		border-radius: 10px;
		background: #f1f5f9;
		color: #1d72fe;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.view-profile-btn:hover {
		background: #e0f2fe;
	}

	/* Empty States */
	.empty-state-card {
		padding: 48px 32px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid rgba(226, 232, 240, 0.85);
	}

	.empty-icon-wrap {
		font-size: 42px;
		margin-bottom: 12px;
	}

	.empty-title {
		font-size: 20px;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 8px 0;
	}

	.empty-desc {
		font-size: 14px;
		color: #64748b;
		max-width: 480px;
		line-height: 1.5;
		margin: 0 0 24px 0;
	}

	.empty-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.skeleton-team-card {
		height: 240px;
		border-radius: 20px;
	}
</style>
