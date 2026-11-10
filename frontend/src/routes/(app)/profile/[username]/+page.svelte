<script lang="ts">
	import { usersApi, type StudentProfile } from '$lib/api/client';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let profile = $state<StudentProfile | null>(null);
	let loading = $state(true);
	let error = $state('');

	const username = $derived(page.params.username);

	onMount(async () => {
		try {
			const res = await usersApi.getProfile(username);
			profile = res.data;
		} catch (e: unknown) {
			error = (e as Error).message ?? 'Profile not found';
		} finally {
			loading = false;
		}
	});

	function getInitials(name: string) {
		return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
	}

	const levelColors = {
		beginner: 'badge-neutral',
		intermediate: 'badge-primary',
		advanced: 'badge-success',
		expert: 'badge-warning',
	};
</script>

<svelte:head>
	<title>{profile ? `${profile.fullName} — CollabSphere` : 'Profile — CollabSphere'}</title>
</svelte:head>

<div class="profile-page">
	{#if loading}
		<div class="profile-loading">
			<div class="skeleton profile-hero-skeleton"></div>
			<div class="profile-body">
				<div class="skeleton" style="height:120px;border-radius:14px;"></div>
				<div class="skeleton" style="height:200px;border-radius:14px;"></div>
			</div>
		</div>
	{:else if error}
		<div class="profile-error card">
			<h2>Profile not found</h2>
			<p>{error}</p>
			<a href="/discover">← Back to discover</a>
		</div>
	{:else if profile}
		<!-- Hero section -->
		<div class="profile-hero">
			<div class="profile-hero-bg"></div>
			<div class="profile-hero-content">
				<div class="avatar avatar-2xl profile-avatar">
					{#if profile.avatarUrl}
						<img src={profile.avatarUrl} alt={profile.fullName} />
					{:else}
						{getInitials(profile.fullName)}
					{/if}
				</div>
				<div class="profile-hero-info">
					<h1 class="profile-name">{profile.fullName}</h1>
					<p class="profile-username">@{profile.username}</p>
					{#if profile.headline}
						<p class="profile-headline">{profile.headline}</p>
					{/if}
					<div class="profile-meta-row">
						{#if profile.institution}
							<span class="profile-meta-item">
								🎓 {profile.institution}{profile.department ? ` · ${profile.department}` : ''}
							</span>
						{/if}
						{#if profile.city || profile.country}
							<span class="profile-meta-item">
								📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
							</span>
						{/if}
					</div>
				</div>

				<div class="profile-actions">
					{#if profile.openToCollaborate}
						<span class="badge badge-success">✓ Open to collaborate</span>
					{/if}
				</div>
			</div>

			<!-- Stats -->
			<div class="profile-stats">
				<div class="profile-stat">
					<span class="profile-stat-value">{profile.connectionCount}</span>
					<span class="profile-stat-label">Connections</span>
				</div>
				<div class="profile-stat">
					<span class="profile-stat-value">{profile.followerCount}</span>
					<span class="profile-stat-label">Followers</span>
				</div>
				<div class="profile-stat">
					<span class="profile-stat-value">{profile.skills.length}</span>
					<span class="profile-stat-label">Skills</span>
				</div>
				<div class="profile-stat">
					<span class="profile-stat-value">{profile.projects ? profile.projects.length : 0}</span>
					<span class="profile-stat-label">Projects</span>
				</div>
			</div>
		</div>

		<div class="profile-body">
			<!-- About -->
			{#if profile.bio}
				<section class="card profile-section">
					<h2 class="section-heading">About</h2>
					<p class="profile-bio">{profile.bio}</p>
				</section>
			{/if}

			<!-- Project Showcase & Portfolio -->
			<section class="card profile-section">
				<div class="section-header-row">
					<h2 class="section-heading">Project Showcase & Portfolio</h2>
					{#if profile.projects && profile.projects.length > 0}
						<span class="project-count-pill">{profile.projects.length} {profile.projects.length === 1 ? 'Project' : 'Projects'}</span>
					{/if}
				</div>

				{#if profile.projects && profile.projects.length > 0}
					<div class="portfolio-grid">
						{#each profile.projects as proj}
							<div class="portfolio-card">
								<div class="portfolio-card-top">
									<div class="portfolio-badges">
										<span class="status-tag status-{proj.status}">
											{proj.status === 'active' ? 'In Progress' : proj.status.replace('_', ' ')}
										</span>
										{#if proj.domain}
											<span class="domain-tag">{proj.domain}</span>
										{/if}
									</div>
									<span class="role-pill {proj.role.toLowerCase().includes('lead') ? 'role-lead' : ''}">
										{proj.role}
									</span>
								</div>

								<h3 class="portfolio-title">
									<a href="/projects/{proj.id}">{proj.name}</a>
								</h3>

								{#if proj.tagline}
									<p class="portfolio-tagline">{proj.tagline}</p>
								{:else if proj.description}
									<p class="portfolio-desc">{proj.description.slice(0, 110)}{proj.description.length > 110 ? '...' : ''}</p>
								{/if}

								{#if proj.skills && proj.skills.length > 0}
									<div class="portfolio-skills">
										{#each proj.skills.slice(0, 4) as sk}
											<span class="skill-mini-tag">{sk}</span>
										{/each}
										{#if proj.skills.length > 4}
											<span class="skill-mini-tag more">+{proj.skills.length - 4}</span>
										{/if}
									</div>
								{/if}

								<div class="portfolio-card-footer">
									<div class="portfolio-links">
										{#if proj.githubUrl}
											<a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" class="ext-link" title="GitHub Repository">
												<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
												Code
											</a>
										{/if}
										{#if proj.demoUrl}
											<a href={proj.demoUrl} target="_blank" rel="noopener noreferrer" class="ext-link demo" title="Live Demo">
												🔗 Demo
											</a>
										{/if}
									</div>
									<a href="/projects/{proj.id}" class="view-project-link">
										Details →
									</a>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="empty-portfolio-text">No showcase projects listed yet.</p>
				{/if}
			</section>

			<!-- Skills -->
			{#if profile.skills.length > 0}
				<section class="card profile-section">
					<h2 class="section-heading">Skills</h2>
					<div class="skills-grid">
						{#each profile.skills as skill}
							<div class="skill-item">
								<div class="skill-left">
									<span class="skill-name">{skill.name}</span>
									{#if skill.isPrimary}
										<span class="skill-primary">Primary</span>
									{/if}
								</div>
								<span class="badge {levelColors[skill.level] ?? 'badge-neutral'}">{skill.level}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Links -->
			{#if profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.websiteUrl}
				<section class="card profile-section">
					<h2 class="section-heading">Links</h2>
					<div class="profile-links">
						{#if profile.githubUrl}
							<a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" class="profile-link">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
								GitHub
							</a>
						{/if}
						{#if profile.linkedinUrl}
							<a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" class="profile-link">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
								LinkedIn
							</a>
						{/if}
						{#if profile.portfolioUrl}
							<a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" class="profile-link">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
								Portfolio
							</a>
						{/if}
						{#if profile.websiteUrl}
							<a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" class="profile-link">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
								Website
							</a>
						{/if}
					</div>
				</section>
			{/if}
		</div>
	{/if}
</div>

<style>
	.profile-page {
		max-width: 860px;
		margin: 0 auto;
		padding: 32px;
		animation: slideUp 0.2s ease;
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.profile-loading { display: flex; flex-direction: column; gap: 16px; }
	.profile-hero-skeleton { height: 220px; border-radius: var(--radius-xl); }
	.profile-body { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }

	/* Hero */
	.profile-hero {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.profile-hero-bg {
		height: 120px;
		background: linear-gradient(135deg, #4338ca 0%, #5b4cf5 50%, #7c3aed 100%);
	}

	.profile-hero-content {
		padding: 0 28px 20px;
		display: flex;
		align-items: flex-end;
		gap: 20px;
		margin-top: -48px;
	}

	.profile-avatar {
		border: 4px solid white;
		box-shadow: var(--shadow-md);
	}

	.profile-hero-info { flex: 1; padding-bottom: 4px; }

	.profile-name {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 0 0 2px;
	}

	.profile-username {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin: 0 0 6px;
	}

	.profile-headline {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0 0 8px;
	}

	.profile-meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.profile-meta-item {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.profile-actions { padding-bottom: 4px; }

	/* Stats */
	.profile-stats {
		display: flex;
		border-top: 1px solid var(--color-border-subtle);
		padding: 16px 28px;
		gap: 32px;
	}

	.profile-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.profile-stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		font-family: var(--font-display);
	}

	.profile-stat-label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	/* Sections */
	.profile-section {
		padding: 24px;
	}

	.section-heading {
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 16px;
	}

	.section-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.section-header-row .section-heading {
		margin-bottom: 0;
	}

	.project-count-pill {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 8px;
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #e5e7eb);
		border-radius: 9999px;
		color: var(--color-text-secondary);
	}

	.portfolio-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}

	.portfolio-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #e5e7eb);
		transition: border-color 0.15s ease, transform 0.15s ease;
	}

	.portfolio-card:hover {
		border-color: var(--color-primary-300, #a5b4fc);
		transform: translateY(-1px);
	}

	.portfolio-card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.portfolio-badges {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.status-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: capitalize;
	}
	.status-tag.status-active { background: #dcfce7; color: #166534; }
	.status-tag.status-completed { background: #f3f4f6; color: #374151; }
	.status-tag.status-planning { background: #e0e7ff; color: #3730a3; }
	.status-tag.status-on_hold { background: #fef3c7; color: #92400e; }

	.domain-tag {
		font-size: 0.6875rem;
		background: #f3f4f6;
		color: #4b5563;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.role-pill {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		background: #f3f4f6;
		color: #4b5563;
	}
	.role-pill.role-lead {
		background: #eef2ff;
		color: #4338ca;
	}

	.portfolio-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}

	.portfolio-title a {
		color: var(--color-text-primary);
		text-decoration: none;
	}
	.portfolio-title a:hover {
		color: var(--color-primary-600, #4f46e5);
		text-decoration: underline;
	}

	.portfolio-tagline, .portfolio-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.portfolio-skills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.skill-mini-tag {
		font-size: 0.6875rem;
		background: white;
		border: 1px solid #e5e7eb;
		color: #4b5563;
		padding: 2px 6px;
		border-radius: 4px;
	}
	.skill-mini-tag.more {
		background: #f3f4f6;
		color: #6b7280;
	}

	.portfolio-card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: 10px;
		border-top: 1px solid #f3f4f6;
	}

	.portfolio-links {
		display: flex;
		gap: 8px;
	}

	.ext-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		color: #4b5563;
		text-decoration: none;
		font-weight: 500;
	}
	.ext-link:hover {
		color: var(--color-primary-600, #4f46e5);
		text-decoration: underline;
	}

	.view-project-link {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
		text-decoration: none;
	}
	.view-project-link:hover {
		text-decoration: underline;
	}

	.empty-portfolio-text {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.profile-bio {
		white-space: pre-line;
		line-height: 1.7;
		color: var(--color-text-secondary);
	}

	/* Skills */
	.skills-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.skill-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--color-neutral-50);
		border-radius: var(--radius-md);
	}

	.skill-left { display: flex; align-items: center; gap: 8px; }

	.skill-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.skill-primary {
		font-size: 0.6875rem;
		background: var(--color-primary-100);
		color: var(--color-primary-700);
		padding: 2px 6px;
		border-radius: var(--radius-full);
		font-weight: 500;
	}

	/* Links */
	.profile-links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.profile-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}
	.profile-link:hover {
		border-color: var(--color-primary-400);
		background: var(--color-primary-50);
		color: var(--color-primary-600);
		text-decoration: none;
	}

	/* Error */
	.profile-error {
		padding: 48px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	@media (max-width: 640px) {
		.profile-page { padding: 16px; }
		.profile-hero-content { flex-direction: column; align-items: flex-start; margin-top: -36px; }
		.profile-stats { gap: 20px; }
	}
</style>
