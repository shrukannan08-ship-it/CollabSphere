<script lang="ts">
	import { usersApi, type StudentProfile } from '$lib/api/client';
	import { currentUser } from '$lib/stores/auth';
	import { page } from '$app/state';

	let profile = $state<StudentProfile | null>(null);
	let loading = $state(true);
	let error = $state('');

	const username = $derived(page.params.username);
	const isOwnProfile = $derived(Boolean(profile && $currentUser && profile.userId === $currentUser.id));

	$effect(() => {
		const targetUsername = username;
		if (!targetUsername) return;
		loading = true;
		error = '';
		usersApi
			.getProfile(targetUsername)
			.then((res) => {
				profile = res.data;
			})
			.catch((e: unknown) => {
				error = (e as Error).message ?? 'Profile not found';
				profile = null;
			})
			.finally(() => {
				loading = false;
			});
	});

	function getInitials(name: string) {
		if (!name) return 'CS';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const levelColors: Record<string, string> = {
		beginner: 'badge-neutral',
		intermediate: 'badge-primary',
		advanced: 'badge-success',
		expert: 'badge-warning',
	};

	const hasAcademicInfo = $derived(
		Boolean(
			profile?.institution ||
				profile?.department ||
				profile?.degree ||
				profile?.yearOfStudy ||
				profile?.graduationYear ||
				profile?.city ||
				profile?.country
		)
	);
</script>

<svelte:head>
	<title>{profile ? `${profile.fullName} — Profile — CollabSphere` : 'Student Profile — CollabSphere'}</title>
</svelte:head>

<div class="profile-page">
	{#if loading}
		<div class="profile-loading">
			<div class="skeleton profile-hero-skeleton"></div>
			<div class="profile-grid-skeleton">
				<div class="skeleton main-col-skeleton"></div>
				<div class="skeleton side-col-skeleton"></div>
			</div>
		</div>
	{:else if error}
		<div class="profile-error card">
			<h2>Profile not found</h2>
			<p>{error}</p>
			<a href="/discover" class="primary-action-btn">Discover Peers</a>
		</div>
	{:else if profile}
		<!-- Profile Header Card (First Screenshot Sky-Blue Banner + Crisp Alignment) -->
		<section class="profile-header-card card">
			<div class="profile-banner"></div>

			<div class="profile-header-body">
				<div class="profile-identity-row">
					<div class="profile-avatar-circle">
						{#if profile.avatarUrl}
							<img src={profile.avatarUrl} alt={profile.fullName} />
						{:else}
							<span>{getInitials(profile.fullName)}</span>
						{/if}
					</div>

					<div class="profile-identity-text">
						<div class="name-badge-row">
							<h1 class="profile-name">{profile.fullName}</h1>
							{#if profile.openToCollaborate}
								<span class="collab-status-pill">Open to Collaborate</span>
							{/if}
						</div>

						<p class="profile-handle-role">
							@{profile.username}
							{#if profile.headline}
								<span class="role-sep">·</span>
								<span class="profile-role-text">{profile.headline}</span>
							{:else if profile.role}
								<span class="role-sep">·</span>
								<span class="profile-role-text capitalize">{profile.role}</span>
							{/if}
						</p>

						{#if profile.institution || profile.department}
							<p class="profile-academic-line">
								{[profile.institution, profile.department].filter(Boolean).join(' · ')}
							</p>
						{/if}
					</div>

					<div class="profile-header-actions">
						{#if isOwnProfile}
							<a href="/profile/edit" class="primary-action-btn">Edit Profile</a>
						{/if}
						{#if profile.githubUrl}
							<a
								href={profile.githubUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="outline-action-btn"
							>
								View GitHub Repository
							</a>
						{/if}
					</div>
				</div>

				<!-- Aligned Summary Metrics Bar -->
				<div class="profile-stats-strip">
					<div class="stat-cell">
						<span class="stat-val">{profile.projects ? profile.projects.length : 0}</span>
						<span class="stat-lbl">Projects</span>
					</div>
					<div class="stat-cell">
						<span class="stat-val">{profile.skills.length}</span>
						<span class="stat-lbl">Skills</span>
					</div>
					<div class="stat-cell">
						<span class="stat-val">{profile.connectionCount}</span>
						<span class="stat-lbl">Connections</span>
					</div>
					<div class="stat-cell">
						<span class="stat-val">{profile.followerCount}</span>
						<span class="stat-lbl">Followers</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Balanced Two-Column Profile Content Grid -->
		<div class="profile-content-grid">
			<!-- Left Main Column -->
			<div class="profile-main-col">
				<!-- About Section -->
				<section class="profile-card card">
					<div class="card-header-bar">
						<h2 class="section-title">About</h2>
						{#if isOwnProfile && !profile.bio}
							<a href="/profile/edit" class="section-edit-link">Edit Profile</a>
						{/if}
					</div>

					{#if profile.bio}
						<p class="bio-copy">{profile.bio}</p>
					{:else}
						<p class="empty-section-text">
							{isOwnProfile
								? 'No bio added yet. Click Edit Profile to share your background and collaboration goals.'
								: 'No introduction provided yet.'}
						</p>
					{/if}
				</section>

				<!-- Projects & Contributions Section -->
				<section class="profile-card card">
					<div class="card-header-bar">
						<h2 class="section-title">Projects & Contributions</h2>
						{#if profile.projects && profile.projects.length > 0}
							<span class="count-pill">
								{profile.projects.length} {profile.projects.length === 1 ? 'Project' : 'Projects'}
							</span>
						{/if}
					</div>

					{#if profile.projects && profile.projects.length > 0}
						<div class="projects-grid">
							{#each profile.projects as proj}
								<article class="project-subcard">
									<div class="project-subcard-top">
										<div class="badge-group">
											<span class="status-tag status-{proj.status}">
												{proj.status === 'active' ? 'In Progress' : proj.status.replace('_', ' ')}
											</span>
											{#if proj.domain}
												<span class="domain-tag">{proj.domain}</span>
											{/if}
										</div>
										<span class="role-badge {proj.role.toLowerCase().includes('lead') ? 'lead' : ''}">
											{proj.role}
										</span>
									</div>

									<h3 class="project-subcard-title">
										<a href="/projects/{proj.id}">{proj.name}</a>
									</h3>

									{#if proj.tagline}
										<p class="project-subcard-desc">{proj.tagline}</p>
									{:else if proj.description}
										<p class="project-subcard-desc">
											{proj.description.slice(0, 110)}{proj.description.length > 110 ? '...' : ''}
										</p>
									{/if}

									{#if proj.skills && proj.skills.length > 0}
										<div class="project-skills-row">
											{#each proj.skills.slice(0, 4) as sk}
												<span class="mini-skill-chip">{sk}</span>
											{/each}
											{#if proj.skills.length > 4}
												<span class="mini-skill-chip muted">+{proj.skills.length - 4}</span>
											{/if}
										</div>
									{/if}

									<div class="project-subcard-footer">
										<div class="external-links">
											{#if proj.githubUrl}
												<a
													href={proj.githubUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="repo-link"
												>
													View GitHub Repository
												</a>
											{/if}
											{#if proj.demoUrl}
												<a
													href={proj.demoUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="repo-link"
												>
													Live Demo
												</a>
											{/if}
										</div>
										<a href="/projects/{proj.id}" class="view-proj-btn">View Project</a>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<div class="empty-projects-block">
							<p class="empty-section-text">
								{isOwnProfile
									? 'You have not created or joined any projects yet.'
									: 'No public project contributions listed yet.'}
							</p>
							{#if isOwnProfile}
								<div class="empty-actions">
									<a href="/projects/new" class="primary-action-btn">Create Project</a>
									<a href="/projects" class="outline-action-btn">Explore Projects</a>
								</div>
							{/if}
						</div>
					{/if}
				</section>
			</div>

			<!-- Right Structured Sidebar Column -->
			<aside class="profile-side-col">
				<!-- Academic Information Card -->
				<section class="profile-card card">
					<h2 class="section-title">Academic Information</h2>

					{#if hasAcademicInfo}
						<dl class="academic-dl">
							{#if profile.institution}
								<div class="dl-row">
									<dt>Institution</dt>
									<dd>{profile.institution}</dd>
								</div>
							{/if}
							{#if profile.department}
								<div class="dl-row">
									<dt>Department</dt>
									<dd>{profile.department}</dd>
								</div>
							{/if}
							{#if profile.degree}
								<div class="dl-row">
									<dt>Degree</dt>
									<dd>{profile.degree}</dd>
								</div>
							{/if}
							{#if profile.yearOfStudy}
								<div class="dl-row">
									<dt>Year of Study</dt>
									<dd>Year {profile.yearOfStudy}</dd>
								</div>
							{/if}
							{#if profile.graduationYear}
								<div class="dl-row">
									<dt>Graduation Year</dt>
									<dd>{profile.graduationYear}</dd>
								</div>
							{/if}
							{#if profile.city || profile.country}
								<div class="dl-row">
									<dt>Location</dt>
									<dd>{[profile.city, profile.country].filter(Boolean).join(', ')}</dd>
								</div>
							{/if}
						</dl>
					{:else}
						<p class="empty-section-text">
							{isOwnProfile
								? 'Add your university, department, and graduation year in Edit Profile.'
								: 'No academic information listed.'}
						</p>
					{/if}
				</section>

				<!-- Skills Card -->
				<section class="profile-card card">
					<div class="card-header-bar">
						<h2 class="section-title">Skills</h2>
						{#if profile.skills.length > 0}
							<span class="count-pill">{profile.skills.length}</span>
						{/if}
					</div>

					{#if profile.skills.length > 0}
						<div class="skills-list">
							{#each profile.skills as skill}
								<div class="skill-row">
									<div class="skill-name-wrap">
										<span class="skill-name">{skill.name}</span>
										{#if skill.isPrimary}
											<span class="primary-tag">Primary</span>
										{/if}
									</div>
									<span class="badge {levelColors[skill.level] ?? 'badge-neutral'}">
										{skill.level}
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-section-text">
							{isOwnProfile
								? 'No skills added yet. Add skills in Edit Profile so teammates can discover you.'
								: 'No skills listed yet.'}
						</p>
					{/if}
				</section>

				<!-- Collaboration Interests & Portfolio Links -->
				<section class="profile-card card">
					<h2 class="section-title">Collaboration & Links</h2>

					<div class="collab-summary-box">
						<span class="collab-label">Collaboration Availability</span>
						<span class="collab-value {profile.openToCollaborate ? 'open' : 'closed'}">
							{profile.openToCollaborate ? 'Open to join student teams' : 'Not currently seeking teams'}
						</span>
					</div>

					{#if profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.websiteUrl}
						<div class="links-stack">
							{#if profile.githubUrl}
								<a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" class="ext-profile-link">
									View GitHub Repository
								</a>
							{/if}
							{#if profile.linkedinUrl}
								<a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" class="ext-profile-link">
									LinkedIn Profile
								</a>
							{/if}
							{#if profile.portfolioUrl}
								<a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" class="ext-profile-link">
									Portfolio Website
								</a>
							{/if}
							{#if profile.websiteUrl}
								<a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" class="ext-profile-link">
									Personal Website
								</a>
							{/if}
						</div>
					{:else}
						<p class="empty-section-text">No GitHub or portfolio links added.</p>
					{/if}
				</section>
			</aside>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		display: flex;
		flex-direction: column;
		gap: 22px;
		max-width: 1180px;
		margin: 0 auto;
		width: 100%;
	}

	/* Skeleton Loading */
	.profile-loading {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.profile-hero-skeleton {
		height: 240px;
		border-radius: 20px;
	}
	.profile-grid-skeleton {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 22px;
	}
	.main-col-skeleton {
		height: 320px;
		border-radius: 20px;
	}
	.side-col-skeleton {
		height: 320px;
		border-radius: 20px;
	}

	/* Profile Header Card */
	.profile-header-card {
		background: #ffffff;
		border: 1px solid #e6edf5;
		border-radius: 20px;
		overflow: hidden;
	}

	.profile-banner {
		height: 112px;
		background: linear-gradient(125deg, #eef6ff 0%, #dbeafe 55%, #bfdbfe 100%);
		border-bottom: 1px solid #e2ecfb;
	}

	.profile-header-body {
		padding: 0 28px 22px;
	}

	.profile-identity-row {
		display: flex;
		align-items: flex-end;
		gap: 22px;
		margin-top: -44px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.profile-avatar-circle {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		background: linear-gradient(135deg, #2563eb, #1d72fe);
		color: #ffffff;
		font-size: 1.875rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 4px solid #ffffff;
		box-shadow: 0 6px 18px rgba(29, 114, 254, 0.2);
		flex-shrink: 0;
		overflow: hidden;
	}
	.profile-avatar-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.profile-identity-text {
		flex: 1;
		min-width: 240px;
		padding-top: 48px;
	}

	.name-badge-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.profile-name {
		font-size: 1.5rem;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
		line-height: 1.2;
	}

	.collab-status-pill {
		font-size: 0.75rem;
		font-weight: 700;
		color: #15803d;
		background: #dcfce7;
		padding: 4px 10px;
		border-radius: 9999px;
	}

	.profile-handle-role {
		font-size: 0.875rem;
		color: #64748b;
		margin: 4px 0 0 0;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.role-sep {
		color: #cbd5e1;
	}
	.profile-role-text {
		color: #334155;
		font-weight: 500;
	}
	.capitalize {
		text-transform: capitalize;
	}

	.profile-academic-line {
		font-size: 0.84375rem;
		color: #475569;
		margin: 4px 0 0 0;
	}

	.profile-header-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding-top: 10px;
	}

	.primary-action-btn {
		padding: 9px 18px;
		border-radius: 10px;
		background: #1d72fe;
		color: #ffffff;
		font-size: 0.84375rem;
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.16s ease;
	}
	.primary-action-btn:hover {
		background: #155bd5;
		text-decoration: none;
	}

	.outline-action-btn {
		padding: 9px 16px;
		border-radius: 10px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #1e293b;
		font-size: 0.84375rem;
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.16s ease, border-color 0.16s ease;
	}
	.outline-action-btn:hover {
		background: #f8fafc;
		border-color: #94a3b8;
		text-decoration: none;
	}

	/* Stats Strip */
	.profile-stats-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(100px, 140px));
		gap: 16px;
		padding-top: 18px;
		border-top: 1px solid #f1f5f9;
	}

	.stat-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat-val {
		font-size: 1.25rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
	}
	.stat-lbl {
		font-size: 0.75rem;
		font-weight: 500;
		color: #64748b;
	}

	/* Balanced Two-Column Layout */
	.profile-content-grid {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 22px;
		align-items: start;
	}

	.profile-main-col,
	.profile-side-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	.profile-card {
		padding: 22px 24px;
		background: #ffffff;
		border-radius: 20px;
		border: 1px solid #e6edf5;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.card-header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.section-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.section-edit-link {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #1d72fe;
		text-decoration: none;
	}

	.count-pill {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 3px 10px;
		border-radius: 9999px;
		background: #eff6ff;
		color: #1d72fe;
	}

	.bio-copy {
		font-size: 0.90625rem;
		color: #334155;
		line-height: 1.65;
		white-space: pre-line;
		margin: 0;
	}

	.empty-section-text {
		font-size: 0.84375rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	/* Projects Showcase */
	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
		gap: 14px;
	}

	.project-subcard {
		padding: 16px;
		border-radius: 14px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.project-subcard-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.badge-group {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.status-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 6px;
		text-transform: capitalize;
	}
	.status-tag.status-active { background: #dcfce7; color: #166534; }
	.status-tag.status-planning { background: #dbeafe; color: #1d4ed8; }
	.status-tag.status-completed { background: #f1f5f9; color: #334155; }
	.status-tag.status-on_hold { background: #fef3c7; color: #92400e; }

	.domain-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 6px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		color: #475569;
	}

	.role-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 6px;
		background: #e2e8f0;
		color: #334155;
	}
	.role-badge.lead {
		background: #eff6ff;
		color: #1d72fe;
	}

	.project-subcard-title {
		font-size: 0.96875rem;
		font-weight: 700;
		margin: 0;
	}
	.project-subcard-title a {
		color: #0f172a;
		text-decoration: none;
	}
	.project-subcard-title a:hover {
		color: #1d72fe;
		text-decoration: underline;
	}

	.project-subcard-desc {
		font-size: 0.8125rem;
		color: #64748b;
		line-height: 1.45;
		margin: 0;
	}

	.project-skills-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.mini-skill-chip {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 6px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		color: #334155;
	}
	.mini-skill-chip.muted {
		color: #64748b;
	}

	.project-subcard-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding-top: 10px;
		border-top: 1px solid #e2e8f0;
		margin-top: auto;
	}
	.external-links {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.repo-link {
		font-size: 0.75rem;
		font-weight: 600;
		color: #475569;
		text-decoration: none;
	}
	.repo-link:hover {
		color: #1d72fe;
		text-decoration: underline;
	}
	.view-proj-btn {
		font-size: 0.75rem;
		font-weight: 700;
		color: #1d72fe;
		text-decoration: none;
		flex-shrink: 0;
	}

	.empty-projects-block {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.empty-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* Academic Info List */
	.academic-dl {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 0;
	}
	.dl-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid #f1f5f9;
	}
	.dl-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
	.dl-row dt {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #64748b;
	}
	.dl-row dd {
		font-size: 0.84375rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0;
		text-align: right;
	}

	/* Skills List */
	.skills-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.skill-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 9px 12px;
		border-radius: 10px;
		background: #f8fafc;
	}
	.skill-name-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.skill-name {
		font-size: 0.84375rem;
		font-weight: 600;
		color: #0f172a;
	}
	.primary-tag {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 6px;
		background: #dbeafe;
		color: #1d4ed8;
	}

	/* Collaboration & Links */
	.collab-summary-box {
		padding: 12px 14px;
		border-radius: 12px;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.collab-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
	}
	.collab-value {
		font-size: 0.84375rem;
		font-weight: 700;
	}
	.collab-value.open { color: #15803d; }
	.collab-value.closed { color: #64748b; }

	.links-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ext-profile-link {
		padding: 9px 14px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #1e293b;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.ext-profile-link:hover {
		border-color: #1d72fe;
		background: #eff6ff;
		color: #1d72fe;
		text-decoration: none;
	}

	.profile-error {
		padding: 48px 24px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	@media (max-width: 960px) {
		.profile-content-grid,
		.profile-grid-skeleton {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.profile-header-body {
			padding: 0 18px 18px;
		}
		.profile-identity-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		.profile-identity-text {
			padding-top: 0;
		}
		.profile-stats-strip {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
