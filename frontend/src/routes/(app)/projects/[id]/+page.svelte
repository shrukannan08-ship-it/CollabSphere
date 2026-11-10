<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		projectsApi,
		positionsApi,
		ApiClientError,
		type ProjectDetail,
		type PositionDetail,
		type ApplicationDetail,
		type JoinRequestDetail,
	} from '$lib/api/client';
	import { currentUser, ui } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ProjectDiscussions from '$lib/components/discussions/ProjectDiscussions.svelte';

	let project = $state<ProjectDetail | null>(null);
	let positions = $state<PositionDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let isEditing = $state(false);
	let saving = $state(false);
	let deleting = $state(false);

	// Edit form state
	let editName = $state('');
	let editTagline = $state('');
	let editDescription = $state('');
	let editDomain = $state('');
	let editStatus = $state<'planning' | 'active' | 'completed' | 'archived' | 'on_hold'>('planning');
	let editGithubUrl = $state('');
	let editDemoUrl = $state('');
	let editDocumentationUrl = $state('');
	let editSkillsInput = $state('');
	let editTeamSize = $state(4);
	let editRecruitmentStatus = $state<'open' | 'closed'>('open');

	// Recruitment modal state
	let showRecruitModal = $state(false);
	let creatingRole = $state(false);
	let roleTitle = $state('');
	let roleDesc = $state('');
	let roleSkills = $state('');
	let roleNiceToHave = $state('');
	let roleSlots = $state(1);

	// Applications management modal
	let viewingPosition = $state<PositionDetail | null>(null);
	let positionApplications = $state<ApplicationDetail[]>([]);
	let loadingApplications = $state(false);
	let reviewingAppId = $state<string | null>(null);

	// Join Request state
	let myRequest = $state<JoinRequestDetail | null>(null);
	let loadingMyRequest = $state(false);
	let showJoinModal = $state(false);
	let joinMessage = $state('');
	let submittingJoin = $state(false);

	let joinRequests = $state<JoinRequestDetail[]>([]);
	let loadingJoinRequests = $state(false);
	let reviewingRequestId = $state<string | null>(null);
	let responseMessages = $state<Record<string, string>>({});

	const projectId = $derived(page.params.id);
	const isOwner = $derived(Boolean(project && $currentUser && project.createdBy === $currentUser.id));
	const isMember = $derived(
		Boolean(project?.members?.some((m) => $currentUser && m.userId === $currentUser.id))
	);
	const teamCount = $derived(project?.members?.length ?? 1);
	const teamCapacity = $derived(project?.teamSize ?? 4);
	const isTeamFull = $derived(teamCount >= teamCapacity);
	const pendingJoinRequests = $derived(joinRequests.filter((r) => r.status === 'pending'));

	async function loadProject() {
		loading = true;
		error = null;
		try {
			const [resProject, resPositions] = await Promise.all([
				projectsApi.get(projectId),
				positionsApi.list({ projectId }),
			]);
			project = resProject.data;
			positions = resPositions.data ?? [];
			populateEditForm();

			if ($currentUser) {
				if (project.createdBy === $currentUser.id) {
					loadJoinRequests();
				} else {
					loadMyRequest();
				}
			}
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Project not found';
		} finally {
			loading = false;
		}
	}

	async function loadMyRequest() {
		if (!$currentUser) return;
		loadingMyRequest = true;
		try {
			const res = await projectsApi.getMyJoinRequest(projectId);
			myRequest = res.data;
		} catch {
			// Ignore if not found
		} finally {
			loadingMyRequest = false;
		}
	}

	async function loadJoinRequests() {
		if (!$currentUser) return;
		loadingJoinRequests = true;
		try {
			const res = await projectsApi.getJoinRequests(projectId);
			joinRequests = res.data ?? [];
		} catch {
			// Ignore
		} finally {
			loadingJoinRequests = false;
		}
	}

	async function handleSendJoinRequest(e: Event) {
		e.preventDefault();
		if (!$currentUser) {
			goto('/login');
			return;
		}
		submittingJoin = true;
		try {
			const res = await projectsApi.createJoinRequest(projectId, {
				message: joinMessage.trim() || undefined,
			});
			myRequest = res.data;
			showJoinModal = false;
			joinMessage = '';
			ui.toast.success('Join request sent!', 'The project owner has been notified.');
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Could not submit request', err.message);
			} else {
				ui.toast.error('Could not submit request', 'An unexpected error occurred.');
			}
		} finally {
			submittingJoin = false;
		}
	}

	async function handleReviewJoinRequest(requestId: string, status: 'accepted' | 'rejected') {
		reviewingRequestId = requestId;
		try {
			const responseMessage = responseMessages[requestId]?.trim() || undefined;
			const res = await projectsApi.reviewJoinRequest(projectId, requestId, {
				status,
				responseMessage,
			});
			joinRequests = joinRequests.map((r) => (r.id === requestId ? res.data : r));
			ui.toast.success(
				status === 'accepted' ? 'Request accepted!' : 'Request declined',
				status === 'accepted' ? 'Student added to project team!' : 'Applicant notified.'
			);
			// Refresh project to update members list
			const updatedProjectRes = await projectsApi.get(projectId);
			project = updatedProjectRes.data;
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Review failed', err.message);
			} else {
				ui.toast.error('Review failed', 'An unexpected error occurred.');
			}
		} finally {
			reviewingRequestId = null;
		}
	}

	function populateEditForm() {
		if (!project) return;
		editName = project.name;
		editTagline = project.tagline || '';
		editDescription = project.description;
		editDomain = project.domain || 'Web Dev';
		editStatus = project.status as 'planning' | 'active' | 'completed' | 'archived' | 'on_hold';
		editGithubUrl = project.githubUrl || '';
		editDemoUrl = project.demoUrl || '';
		editDocumentationUrl = project.documentationUrl || '';
		editSkillsInput = project.skills ? project.skills.map((s) => s.name).join(', ') : '';
		editTeamSize = project.teamSize || 4;
		editRecruitmentStatus = project.recruitmentStatus || 'open';
	}

	onMount(() => {
		loadProject();
	});

	async function handleSaveEdit(e: Event) {
		e.preventDefault();
		if (!editName.trim() || !editDescription.trim()) {
			ui.toast.error('Validation error', 'Name and description are required.');
			return;
		}

		saving = true;
		try {
			const requiredSkills = editSkillsInput
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);

			const res = await projectsApi.update(projectId, {
				name: editName.trim(),
				tagline: editTagline.trim() || undefined,
				description: editDescription.trim(),
				domain: editDomain || undefined,
				status: editStatus,
				githubUrl: editGithubUrl.trim() || undefined,
				demoUrl: editDemoUrl.trim() || undefined,
				documentationUrl: editDocumentationUrl.trim() || undefined,
				requiredSkills,
				teamSize: Number(editTeamSize) || 4,
				recruitmentStatus: editRecruitmentStatus,
			});

			project = res.data;
			isEditing = false;
			ui.toast.success('Project updated', 'Changes have been saved.');
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Update failed', err.message);
			} else {
				ui.toast.error('Update failed', 'An unexpected error occurred.');
			}
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
			return;
		}

		deleting = true;
		try {
			await projectsApi.delete(projectId);
			ui.toast.success('Project deleted', 'Your project has been removed.');
			goto('/projects');
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Delete failed', err.message);
			} else {
				ui.toast.error('Delete failed', 'Could not delete project.');
			}
		} finally {
			deleting = false;
		}
	}

	async function handleToggleRecruitment() {
		if (!project) return;
		const newStatus = project.recruitmentStatus === 'open' ? 'closed' : 'open';
		try {
			const res = await projectsApi.updateRecruitment(projectId, newStatus);
			project = res.data;
			editRecruitmentStatus = res.data.recruitmentStatus;
			ui.toast.success('Recruitment updated', `Project recruitment is now ${newStatus === 'open' ? 'Open' : 'Closed'}.`);
		} catch (err: unknown) {
			ui.toast.error('Update failed', (err as Error).message ?? 'Could not update status');
		}
	}

	async function handleCreatePosition(e: Event) {
		e.preventDefault();
		if (!roleTitle.trim() || !roleDesc.trim()) {
			ui.toast.error('Validation error', 'Title and description are required.');
			return;
		}

		const reqSkills = roleSkills.split(',').map((s) => s.trim()).filter(Boolean);
		if (reqSkills.length === 0) {
			ui.toast.error('Validation error', 'Please provide at least one required skill.');
			return;
		}

		creatingRole = true;
		try {
			const niceSkills = roleNiceToHave.split(',').map((s) => s.trim()).filter(Boolean);
			const res = await positionsApi.create({
				projectId,
				title: roleTitle.trim(),
				description: roleDesc.trim(),
				requiredSkills: reqSkills,
				niceToHave: niceSkills,
				slots: Number(roleSlots) || 1,
			});

			positions = [res.data, ...positions];
			showRecruitModal = false;
			roleTitle = '';
			roleDesc = '';
			roleSkills = '';
			roleNiceToHave = '';
			roleSlots = 1;
			ui.toast.success('Position created', 'Recruitment post is now open to students.');
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Failed to create role', err.message);
			} else {
				ui.toast.error('Failed to create role', 'An unexpected error occurred.');
			}
		} finally {
			creatingRole = false;
		}
	}

	async function handleTogglePositionStatus(pos: PositionDetail) {
		try {
			const res = await positionsApi.update(pos.id, { isOpen: !pos.isOpen });
			positions = positions.map((p) => (p.id === pos.id ? res.data : p));
			ui.toast.info(`Position ${res.data.isOpen ? 'reopened' : 'closed'}`);
		} catch {
			ui.toast.error('Failed to update status');
		}
	}

	async function handleDeletePosition(positionId: string) {
		if (!confirm('Are you sure you want to delete this recruitment position?')) return;
		try {
			await positionsApi.delete(positionId);
			positions = positions.filter((p) => p.id !== positionId);
			ui.toast.info('Position deleted');
		} catch {
			ui.toast.error('Failed to delete position');
		}
	}

	async function openApplicationsModal(pos: PositionDetail) {
		viewingPosition = pos;
		loadingApplications = true;
		try {
			const res = await positionsApi.getApplications(pos.id);
			positionApplications = res.data ?? [];
		} catch (err: unknown) {
			ui.toast.error('Could not load applicants', (err as Error).message);
		} finally {
			loadingApplications = false;
		}
	}

	async function handleReviewApplication(appId: string, status: 'accepted' | 'rejected') {
		reviewingAppId = appId;
		try {
			const res = await positionsApi.reviewApplication(appId, { status });
			positionApplications = positionApplications.map((a) => (a.id === appId ? res.data : a));
			// refresh positions list to reflect filled slots
			const posRes = await positionsApi.list({ projectId });
			positions = posRes.data ?? [];
			ui.toast.success(`Application ${status}`);
		} catch (err: unknown) {
			ui.toast.error('Review failed', (err as Error).message);
		} finally {
			reviewingAppId = null;
		}
	}
</script>

<svelte:head>
	<title>{project ? `${project.name} — CollabSphere` : 'Project Details — CollabSphere'}</title>
</svelte:head>

<div class="project-details-container">
	<div class="top-nav">
		<a href="/projects" class="back-link">← Back to Projects</a>
	</div>

	{#if loading}
		<div class="skeleton loading-hero"></div>
	{:else if error}
		<div class="card error-card">
			<h2>Unable to load project</h2>
			<p>{error}</p>
			<Button href="/projects" variant="secondary">Back to Projects</Button>
		</div>
	{:else if project}
		{#if isEditing}
			<!-- Edit Mode -->
			<form onsubmit={handleSaveEdit} class="edit-project-form card">
				<h2 class="form-title">Edit Project</h2>
				
				<Input label="Project Name *" bind:value={editName} required />
				<Input label="Tagline" bind:value={editTagline} />

				<div class="input-group">
					<label for="edit-desc" class="input-label">Description *</label>
					<textarea
						id="edit-desc"
						class="textarea"
						rows="6"
						bind:value={editDescription}
						required
					></textarea>
				</div>

				<div class="form-grid">
					<Input label="Domain" bind:value={editDomain} placeholder="e.g. Web Dev, AI/ML" />
					<div class="input-group">
						<label for="edit-status" class="input-label">Status</label>
						<select id="edit-status" bind:value={editStatus} class="select">
							<option value="planning">Planning</option>
							<option value="active">In Progress (Active)</option>
							<option value="completed">Completed (Showcase)</option>
							<option value="on_hold">On Hold</option>
						</select>
					</div>
				</div>

				<Input
					label="Required Skills (comma separated)"
					bind:value={editSkillsInput}
					placeholder="React, TypeScript, Node.js"
				/>

				<div class="form-grid">
					<div class="input-group">
						<label for="edit-teamsize" class="input-label">Target Team Size</label>
						<input
							id="edit-teamsize"
							type="number"
							class="select"
							min="1"
							max="50"
							bind:value={editTeamSize}
						/>
					</div>
					<div class="input-group">
						<label for="edit-recruitment" class="input-label">Recruitment Status</label>
						<select id="edit-recruitment" bind:value={editRecruitmentStatus} class="select">
							<option value="open">🟢 Open for Recruitment</option>
							<option value="closed">🔴 Recruitment Closed</option>
						</select>
					</div>
				</div>

				<div class="form-grid">
					<Input label="GitHub URL" bind:value={editGithubUrl} />
					<Input label="Demo URL" bind:value={editDemoUrl} />
					<Input label="Documentation URL" bind:value={editDocumentationUrl} />
				</div>

				<div class="edit-actions">
					<Button type="submit" variant="primary" loading={saving}>Save Changes</Button>
					<Button type="button" variant="secondary" onclick={() => (isEditing = false)}>Cancel</Button>
				</div>
			</form>
		{:else}
			<!-- View Mode (Screenshots 1 & 2 - Tactile 3D Claymorphic Soft UI) -->
			<div class="project-hero-workspace">
				<div class="hero-top-bar">
					<div class="badges-row">
						<span class="status-badge status-{project.status}">
							{project.status === 'active' ? 'In Progress' : project.status.replace('_', ' ')}
						</span>
						{#if project.recruitmentStatus === 'open'}
							<span class="status-badge status-recruiting">🟢 Recruiting</span>
						{:else}
							<span class="status-badge status-closed">🔴 Recruitment Closed</span>
						{/if}
						<span class="status-badge status-capacity">👥 Capacity: {project.teamSize || 4} members</span>
						{#if project.domain}
							<span class="domain-badge">{project.domain}</span>
						{/if}
					</div>

					<div class="header-right-actions">
						{#if isOwner}
							<Button variant="outline" onclick={handleToggleRecruitment}>
								{project.recruitmentStatus === 'open' ? 'Close Recruitment' : 'Reopen Recruitment'}
							</Button>
							<Button variant="primary" onclick={() => (showRecruitModal = true)}>
								+ Post Open Role
							</Button>
							<Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
							<Button variant="danger" onclick={handleDelete} loading={deleting}>Delete</Button>
						{:else}
							{#if $currentUser}
								{#if isMember}
									<span class="user-role-badge member">✓ Team Member</span>
								{:else if myRequest && myRequest.status === 'pending'}
									<span class="user-role-badge pending">⏳ Join Request Pending</span>
								{:else if myRequest && myRequest.status === 'accepted'}
									<span class="user-role-badge member">✓ Accepted Contributor</span>
								{:else}
									{#if project.recruitmentStatus === 'open' && !isTeamFull}
										<button class="join-project-coral-btn" onclick={() => (showJoinModal = true)}>
											Request to Join →
										</button>
									{:else if isTeamFull}
										<span class="user-role-badge full">Team Full ({teamCount}/{teamCapacity})</span>
									{:else}
										<span class="user-role-badge closed">Recruitment Closed</span>
									{/if}
								{/if}
							{:else}
								<Button variant="primary" href="/login">Log in to Request Join</Button>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Centered Lead Profile & Project Identity (Screenshot 1) -->
				<div class="hero-identity-center">
					<div class="lead-avatar-dock-wrap">
						<div class="lead-avatar-circle">
							{#if project.creatorAvatarUrl}
								<img src={project.creatorAvatarUrl} alt={project.creatorName} />
							{:else}
								<span class="lead-avatar-initials">{project.creatorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
							{/if}
							<span class="lead-online-dot" title="Lead Online"></span>
						</div>

						<!-- Quick Action Pill docked under avatar (Screenshot 1) -->
						<div class="avatar-quick-dock" aria-label="Quick actions">
							<button type="button" class="quick-dock-btn" onclick={() => ui.toast.info('Voice room', 'Join active contributors on Discord/Meet')} title="Voice Channel">
								📞
							</button>
							<a href="#discussions" class="quick-dock-btn" title="Open Discussions">
								💬
							</a>
							<a href="#roadmap" class="quick-dock-btn" title="Project Milestones">
								📅
							</a>
							<a href="#details" class="quick-dock-btn" title="Project Objectives">
								ℹ️
							</a>
						</div>
					</div>

					<h1 class="project-title">{project.name}</h1>
					{#if project.tagline}
						<p class="project-tagline">{project.tagline}</p>
					{/if}

					<div class="creator-meta">
						{#if project.creatorUsername}
							<a href="/profile/{project.creatorUsername}" class="creator-link">
								Initiated by <strong>{project.creatorName}</strong> (@{project.creatorUsername})
							</a>
						{:else}
							<span class="creator-text">Initiated by <strong>{project.creatorName}</strong></span>
						{/if}
						<span class="date-text">· Launched {new Date(project.createdAt).toLocaleDateString()}</span>
					</div>

					<!-- Repository & Live Demo Action Links -->
					<div class="project-links-row">
						{#if project.githubUrl}
							<a href={project.githubUrl} target="_blank" rel="noopener noreferrer" class="link-btn github">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
								GitHub Repo
							</a>
						{/if}

						{#if project.demoUrl}
							<a href={project.demoUrl} target="_blank" rel="noopener noreferrer" class="link-btn demo">
								🔗 Live Demo
							</a>
						{/if}

						{#if project.documentationUrl}
							<a href={project.documentationUrl} target="_blank" rel="noopener noreferrer" class="link-btn docs">
								📖 Documentation
							</a>
						{/if}
					</div>
				</div>

				<!-- Navigation Tab Strip (Screenshot 1) -->
				<div class="workspace-nav-tabstrip">
					<a href="#roadmap" class="tabstrip-pill-btn active">Roadmap</a>
					<a href="#discussions" class="tabstrip-pill-btn">Discussions</a>
					<a href="#team" class="tabstrip-pill-btn">Team Roster ({teamCount})</a>
					<a href="#roles" class="tabstrip-pill-btn">Open Roles ({positions.length})</a>
					{#if isOwner}
						<a href="#join-requests" class="tabstrip-pill-btn highlight">
							Join Requests {#if pendingJoinRequests.length > 0}({pendingJoinRequests.length}){/if}
						</a>
					{/if}
				</div>
			</div>

			<!-- Applicant Status Banner -->
			{#if myRequest && !isOwner}
				<div class="applicant-status-banner banner-{myRequest.status} card">
					<div class="banner-content">
						<div class="banner-title-row">
							<span class="banner-icon">
								{myRequest.status === 'pending' ? '⏳' : myRequest.status === 'accepted' ? '🎉' : '❌'}
							</span>
							<h3 class="banner-heading">
								{myRequest.status === 'pending'
									? 'Your Join Request is Pending Review'
									: myRequest.status === 'accepted'
									? 'Your Join Request was Accepted!'
									: 'Your Join Request was Declined'}
							</h3>
						</div>
						<p class="banner-description">
							{myRequest.status === 'pending'
								? 'The project owner has received your request and will review your profile. You will be notified once they respond.'
								: myRequest.status === 'accepted'
								? 'Welcome to the team! You have been added as an active contributor to this project.'
								: 'The project owner was unable to accept your request at this time.'}
						</p>
						{#if myRequest.message}
							<div class="banner-quote">
								<span class="quote-label">Your message:</span>
								<p class="quote-text">"{myRequest.message}"</p>
							</div>
						{/if}
						{#if myRequest.responseMessage}
							<div class="banner-response">
								<span class="response-label">Project Lead Note:</span>
								<p class="response-text">"{myRequest.responseMessage}"</p>
							</div>
						{/if}
						{#if myRequest.status === 'rejected' && project.recruitmentStatus === 'open' && !isTeamFull}
							<div class="banner-reapply">
								<Button variant="secondary" onclick={() => (showJoinModal = true)}>
									Submit New Request
								</Button>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Owner Join Requests Section -->
			{#if isOwner}
				<section class="join-requests-section card">
					<div class="section-top">
						<div>
							<div class="section-title-badge-row">
								<h2 class="section-title">Team Join Requests</h2>
								{#if pendingJoinRequests.length > 0}
									<span class="pending-count-pill">{pendingJoinRequests.length} Pending</span>
								{/if}
							</div>
							<p class="section-sub">
								Review students who requested to join your project ({teamCount}/{teamCapacity} members).
							</p>
						</div>
					</div>

					{#if isTeamFull}
						<div class="alert-box team-full-notice">
							⚠️ <strong>Team is currently full ({teamCount}/{teamCapacity} members).</strong> Increase the Target Team Size in settings if you want to accept additional team members.
						</div>
					{:else if project.recruitmentStatus === 'closed'}
						<div class="alert-box recruitment-closed-notice">
							🔴 <strong>Recruitment is currently closed.</strong> Reopen recruitment to accept candidate join requests.
						</div>
					{/if}

					{#if loadingJoinRequests}
						<div class="skeleton loading-requests"></div>
					{:else if joinRequests.length === 0}
						<div class="empty-requests">
							<p>No students have requested to join this project yet. They can discover your project from the Explore page and request to join.</p>
						</div>
					{:else}
						<div class="requests-grid">
							{#each joinRequests as req}
								<div class="request-card status-{req.status}">
									<div class="request-card-header">
										<div class="applicant-profile-meta">
											<div class="applicant-avatar">
												{#if req.requesterAvatarUrl}
													<img src={req.requesterAvatarUrl} alt={req.requesterName} />
												{:else}
													<span class="avatar-fallback">
														{req.requesterName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
													</span>
												{/if}
											</div>
											<div class="applicant-info">
												<div class="name-username-row">
													{#if req.requesterUsername}
														<a href="/profile/{req.requesterUsername}" class="applicant-name">
															{req.requesterName}
														</a>
														<span class="applicant-handle">@{req.requesterUsername}</span>
													{:else}
														<span class="applicant-name">{req.requesterName}</span>
													{/if}
												</div>
												{#if req.requesterHeadline}
													<p class="applicant-headline">{req.requesterHeadline}</p>
												{/if}
											</div>
										</div>

										<span class="request-status-badge badge-{req.status}">
											{req.status}
										</span>
									</div>

									{#if req.requesterSkills && req.requesterSkills.length > 0}
										<div class="applicant-skills">
											{#each req.requesterSkills as skill}
												<span class="applicant-skill-tag">{skill}</span>
											{/each}
										</div>
									{/if}

									{#if req.message}
										<div class="applicant-message-box">
											<span class="msg-label">Applicant message:</span>
											<p class="msg-text">{req.message}</p>
										</div>
									{/if}

									<div class="request-meta-row">
										<span class="req-date">Applied {new Date(req.createdAt).toLocaleDateString()}</span>
										{#if req.respondedAt}
											<span class="req-date">· Responded {new Date(req.respondedAt).toLocaleDateString()}</span>
										{/if}
									</div>

									{#if req.responseMessage}
										<div class="previous-response-box">
											<strong>Response:</strong> "{req.responseMessage}"
										</div>
									{/if}

									{#if req.status === 'pending'}
										<div class="review-action-area">
											<input
												type="text"
												class="response-input"
												placeholder="Optional response note to applicant..."
												bind:value={responseMessages[req.id]}
											/>
											<div class="review-buttons-row">
												<button
													type="button"
													class="accept-join-btn"
													disabled={isTeamFull || project.recruitmentStatus === 'closed' || reviewingRequestId === req.id}
													onclick={() => handleReviewJoinRequest(req.id, 'accepted')}
												>
													{reviewingRequestId === req.id ? 'Processing...' : '✓ Accept to Team'}
												</button>
												<button
													type="button"
													class="reject-join-btn"
													disabled={reviewingRequestId === req.id}
													onclick={() => handleReviewJoinRequest(req.id, 'rejected')}
												>
													Decline
												</button>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/if}

			<!-- Open Positions Section -->
			<section class="positions-section card">
				<div class="section-top">
					<div>
						<h2 class="section-title">Open Positions & Team Recruitment</h2>
						<p class="section-sub">Opportunities for students to join this project team.</p>
					</div>
					{#if isOwner}
						<Button variant="secondary" onclick={() => (showRecruitModal = true)}>
							+ Add Role
						</Button>
					{/if}
				</div>

				{#if positions.length === 0}
					<div class="empty-positions">
						<p>No recruitment positions currently posted for this project.</p>
						{#if isOwner}
							<Button variant="primary" onclick={() => (showRecruitModal = true)}>
								Create First Opening
							</Button>
						{/if}
					</div>
				{:else}
					<div class="positions-list">
						{#each positions as pos}
							<div class="position-row">
								<div class="position-info">
									<div class="position-badge-row">
										<span class="role-status-badge {pos.isOpen ? 'open' : 'closed'}">
											{pos.isOpen ? 'Open' : 'Closed'}
										</span>
										<span class="slots-info">
											{pos.filledSlots}/{pos.slots} slots filled
										</span>
									</div>
									<h3 class="role-title">{pos.title}</h3>
									<p class="role-desc">{pos.description}</p>
									<div class="role-skills">
										{#each pos.requiredSkills as skill}
											<span class="skill-tag">{skill}</span>
										{/each}
									</div>
								</div>

								<div class="position-actions">
									{#if isOwner}
										<button
											class="app-count-btn"
											onclick={() => openApplicationsModal(pos)}
										>
											👥 {pos.applicationCount} {pos.applicationCount === 1 ? 'Applicant' : 'Applicants'}
										</button>
										<button
											class="toggle-status-btn"
											onclick={() => handleTogglePositionStatus(pos)}
										>
											{pos.isOpen ? 'Close Role' : 'Reopen Role'}
										</button>
										<button
											class="delete-role-btn"
											onclick={() => handleDeletePosition(pos.id)}
										>
											Delete
										</button>
									{:else if pos.isOpen}
										<Button href="/positions/{pos.id}/apply" variant="primary">
											Apply for Role →
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Milestone Progression Roadmap (Screenshot 1) -->
			<div id="roadmap" class="milestone-roadmap-card card">
				<div class="roadmap-header">
					<div class="roadmap-title-row">
						<span class="roadmap-icon">🚀</span>
						<h3 class="roadmap-title">Project Roadmap & Milestones</h3>
					</div>
					<span class="roadmap-current-status">Status: {project.status.replace('_', ' ').toUpperCase()}</span>
				</div>

				<div class="milestone-steps-track">
					<!-- Step 1: Concept & Planning -->
					<div class="milestone-step-node completed">
						<div class="step-dot">✓</div>
						<div class="step-info">
							<span class="step-title">1. Planning</span>
							<span class="step-desc">Scope defined</span>
						</div>
					</div>

					<div class="milestone-track-line active"></div>

					<!-- Step 2: Team Recruitment -->
					<div class="milestone-step-node {teamCount > 1 || positions.length > 0 ? 'completed' : 'active'}">
						<div class="step-dot">{teamCount > 1 || positions.length > 0 ? '✓' : '2'}</div>
						<div class="step-info">
							<span class="step-title">2. Recruitment</span>
							<span class="step-desc">{teamCount}/{teamCapacity} Joined</span>
						</div>
					</div>

					<div class="milestone-track-line {project.status === 'active' || project.status === 'completed' ? 'active' : ''}"></div>

					<!-- Step 3: Development & Active Sprints -->
					<div class="milestone-step-node {project.status === 'active' || project.status === 'completed' ? (project.status === 'completed' ? 'completed' : 'active') : 'pending'}">
						<div class="step-dot">{project.status === 'completed' ? '✓' : '3'}</div>
						<div class="step-info">
							<span class="step-title">3. Sprints</span>
							<span class="step-desc">Active development</span>
						</div>
					</div>

					<div class="milestone-track-line {project.status === 'completed' ? 'active' : ''}"></div>

					<!-- Step 4: Showcase & Launch -->
					<div class="milestone-step-node {project.status === 'completed' ? 'completed' : 'pending'}">
						<div class="step-dot">{project.status === 'completed' ? '✓' : '4'}</div>
						<div class="step-info">
							<span class="step-title">4. Showcase</span>
							<span class="step-desc">Demo & Launch</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 4 Tactile 3D Metric Boxes (Screenshot 1 & 2) -->
			<div class="project-metrics-4grid">
				<div class="mini-stat-clay-box stat-purple">
					<span class="mini-stat-icon">👥</span>
					<div class="mini-stat-text">
						<span class="mini-stat-num">{teamCapacity} Max</span>
						<span class="mini-stat-label">Team Capacity</span>
					</div>
				</div>

				<div class="mini-stat-clay-box stat-green">
					<span class="mini-stat-icon">🚀</span>
					<div class="mini-stat-text">
						<span class="mini-stat-num">{teamCount} Joined</span>
						<span class="mini-stat-label">Active Members</span>
					</div>
				</div>

				<div class="mini-stat-clay-box stat-blue">
					<span class="mini-stat-icon">💼</span>
					<div class="mini-stat-text">
						<span class="mini-stat-num">{positions.length} Roles</span>
						<span class="mini-stat-label">Open Positions</span>
					</div>
				</div>

				<div class="mini-stat-clay-box stat-coral">
					<span class="mini-stat-icon">📬</span>
					<div class="mini-stat-text">
						<span class="mini-stat-num">{pendingJoinRequests.length} Pending</span>
						<span class="mini-stat-label">Join Requests</span>
					</div>
				</div>
			</div>

			<div class="project-body-grid">
				<!-- Main column -->
				<div class="main-content-col">
					<!-- Description -->
					<div class="description-card card">
						<h2 class="section-title">About the Project</h2>
						<div class="description-content">
							{project.description}
						</div>
					</div>

					<!-- Team & Contributors Showcase -->
					<div class="team-card card">
						<div class="team-header">
							<div>
								<h2 class="section-title">Team & Contributors</h2>
								<p class="section-sub">Active contributors and collaborators on this project.</p>
							</div>
							<span class="member-count-badge">
								{project.members && project.members.length > 0 ? project.members.length : 1} {project.members && project.members.length === 1 ? 'Contributor' : 'Contributors'}
							</span>
						</div>

						<div class="members-grid">
							{#if project.members && project.members.length > 0}
								{#each project.members as member}
									<div class="member-card">
										<div class="member-avatar">
											{#if member.avatarUrl}
												<img src={member.avatarUrl} alt={member.fullName} />
											{:else}
												<span class="avatar-text">
													{member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
												</span>
											{/if}
										</div>
										<div class="member-details">
											<div class="member-name-row">
												{#if member.username}
													<a href="/profile/{member.username}" class="member-name">
														{member.fullName}
													</a>
													<span class="member-handle">@{member.username}</span>
												{:else}
													<span class="member-name">{member.fullName}</span>
												{/if}
											</div>
											<div class="member-role-row">
												<span class="member-role-badge {member.role.toLowerCase().includes('lead') ? 'role-lead' : ''}">
													{member.role}
												</span>
											</div>
										</div>
									</div>
								{/each}
							{:else}
								<div class="member-card">
									<div class="member-avatar">
										{#if project.creatorAvatarUrl}
											<img src={project.creatorAvatarUrl} alt={project.creatorName} />
										{:else}
											<span class="avatar-text">
												{project.creatorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
											</span>
										{/if}
									</div>
									<div class="member-details">
										<div class="member-name-row">
											{#if project.creatorUsername}
												<a href="/profile/{project.creatorUsername}" class="member-name">
													{project.creatorName}
												</a>
												<span class="member-handle">@{project.creatorUsername}</span>
											{:else}
												<span class="member-name">{project.creatorName}</span>
											{/if}
										</div>
										<div class="member-role-row">
											<span class="member-role-badge role-lead">Project Lead</span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Sidebar / Skills & Meta & Checklist (Screenshot 1) -->
				<div class="sidebar-col">
					<!-- Deliverables & Readiness Checklist (Screenshot 1) -->
					<div class="checklist-card card">
						<h2 class="section-title">Requirements & Checklist</h2>
						<div class="checklist-items">
							<div class="check-item-row {project.description ? 'checked' : ''}">
								<span class="check-icon">{project.description ? '✓' : '○'}</span>
								<div class="check-info">
									<span class="check-title">Project Scope</span>
									<span class="check-sub">{project.description ? 'Defined & documented' : 'Pending'}</span>
								</div>
							</div>

							<div class="check-item-row {project.githubUrl ? 'checked' : ''}">
								<span class="check-icon">{project.githubUrl ? '✓' : '○'}</span>
								<div class="check-info">
									<span class="check-title">GitHub Repository</span>
									<span class="check-sub">{project.githubUrl ? 'Connected' : 'Not linked'}</span>
								</div>
							</div>

							<div class="check-item-row {project.demoUrl ? 'checked' : ''}">
								<span class="check-icon">{project.demoUrl ? '✓' : '○'}</span>
								<div class="check-info">
									<span class="check-title">Live Preview / Demo</span>
									<span class="check-sub">{project.demoUrl ? 'Active demo online' : 'Not provided'}</span>
								</div>
							</div>

							<div class="check-item-row {project.recruitmentStatus === 'open' ? 'checked' : ''}">
								<span class="check-icon">{project.recruitmentStatus === 'open' ? '✓' : '○'}</span>
								<div class="check-info">
									<span class="check-title">Recruitment Pipeline</span>
									<span class="check-sub">{project.recruitmentStatus === 'open' ? 'Accepting applications' : 'Closed'}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="skills-card card">
						<h2 class="section-title">Required Skills</h2>
						{#if project.skills && project.skills.length > 0}
							<div class="skills-list">
								{#each project.skills as skill}
									<span class="skill-tag">{skill.name}</span>
								{/each}
							</div>
						{:else}
							<p class="empty-text">No specific required skills listed.</p>
						{/if}
					</div>

					<div class="status-meta-card card">
						<h2 class="section-title">Project Info</h2>
						<div class="meta-row">
							<span class="meta-label">Visibility</span>
							<span class="meta-value">{project.isPublic ? 'Public' : 'Private'}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Created</span>
							<span class="meta-value">{new Date(project.createdAt).toLocaleDateString()}</span>
						</div>
						<div class="meta-row">
							<span class="meta-label">Last Updated</span>
							<span class="meta-value">{new Date(project.updatedAt).toLocaleDateString()}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Discussions Section -->
			<div id="discussions">
				<ProjectDiscussions projectId={project.id} isProjectOwner={isOwner ?? false} />
			</div>
		{/if}
	{/if}

	<!-- Modal: Post New Open Role -->
	{#if showRecruitModal}
		<div class="modal-backdrop" onclick={() => (showRecruitModal = false)}>
			<div class="modal-card card" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>Post Team Recruitment Opening</h2>
					<button class="close-btn" onclick={() => (showRecruitModal = false)}>&times;</button>
				</div>
				<form onsubmit={handleCreatePosition} class="modal-form">
					<Input
						label="Role Title *"
						bind:value={roleTitle}
						placeholder="e.g. Frontend Developer (Svelte/React)"
						required
					/>
					<div class="input-group">
						<label for="role-desc" class="input-label">Role Description *</label>
						<textarea
							id="role-desc"
							class="textarea"
							rows="4"
							bind:value={roleDesc}
							placeholder="Describe the responsibilities, expected commitments, and what they will work on..."
							required
						></textarea>
					</div>
					<Input
						label="Required Skills * (comma separated)"
						bind:value={roleSkills}
						placeholder="e.g. Svelte, TypeScript, Tailwind CSS"
						required
					/>
					<Input
						label="Nice to Have Skills (comma separated)"
						bind:value={roleNiceToHave}
						placeholder="e.g. GraphQL, Figma, Docker"
					/>
					<Input
						label="Number of Openings"
						type="number"
						bind:value={roleSlots}
						min="1"
						max="10"
					/>
					<div class="modal-actions">
						<Button type="submit" variant="primary" loading={creatingRole}>Publish Opening</Button>
						<Button type="button" variant="secondary" onclick={() => (showRecruitModal = false)}>Cancel</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Modal: View & Review Applicants -->
	{#if viewingPosition}
		<div class="modal-backdrop" onclick={() => (viewingPosition = null)}>
			<div class="modal-card wide card" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<div>
						<h2>Applicants: {viewingPosition.title}</h2>
						<p class="modal-sub">Review candidates who applied to join this role.</p>
					</div>
					<button class="close-btn" onclick={() => (viewingPosition = null)}>&times;</button>
				</div>

				<div class="applicants-body">
					{#if loadingApplications}
						<div class="skeleton loading-apps"></div>
					{:else if positionApplications.length === 0}
						<div class="empty-applicants">
							<p>No students have applied to this role yet.</p>
						</div>
					{:else}
						<div class="applicants-list">
							{#each positionApplications as app}
								<div class="applicant-card">
									<div class="app-top">
										<div class="applicant-profile-meta">
											<span class="app-name">{app.applicantName}</span>
											{#if app.applicantUsername}
												<a href="/profile/{app.applicantUsername}" class="app-username" target="_blank">
													@{app.applicantUsername}
												</a>
											{/if}
										</div>
										<span class="app-status-badge status-{app.status}">
											{app.status.replace('_', ' ')}
										</span>
									</div>

									{#if app.applicantHeadline}
										<p class="app-headline">{app.applicantHeadline}</p>
									{/if}

									<div class="app-cover">
										<span class="note-heading">Cover Note:</span>
										<p class="cover-text">{app.coverNote}</p>
									</div>

									{#if app.relevantSkills && app.relevantSkills.length > 0}
										<div class="app-skills">
											{#each app.relevantSkills as skill}
												<span class="skill-tag">{skill}</span>
											{/each}
										</div>
									{/if}

									<div class="app-actions">
										<span class="submitted-date">
											Applied {new Date(app.createdAt).toLocaleDateString()}
										</span>
										{#if app.status === 'pending' || app.status === 'under_review'}
											<div class="review-buttons">
												<button
													class="accept-btn"
													disabled={reviewingAppId === app.id}
													onclick={() => handleReviewApplication(app.id, 'accepted')}
												>
													Accept Application
												</button>
												<button
													class="reject-btn"
													disabled={reviewingAppId === app.id}
													onclick={() => handleReviewApplication(app.id, 'rejected')}
												>
													Reject
												</button>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Modal: Request to Join Project -->
	{#if showJoinModal && project}
		<div class="modal-backdrop" onclick={() => (showJoinModal = false)}>
			<div class="modal-card card" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<div>
						<h2>Request to Join Project</h2>
						<p class="modal-sub">Apply to collaborate on <strong>{project.name}</strong></p>
					</div>
					<button class="close-btn" onclick={() => (showJoinModal = false)}>&times;</button>
				</div>
				<form onsubmit={handleSendJoinRequest} class="modal-form">
					<div class="modal-info-box">
						<p>
							Introduce yourself to <strong>{project.creatorName}</strong>. Highlight what skills you bring, your experience, and how you'd like to contribute.
						</p>
					</div>

					<div class="input-group">
						<label for="join-msg" class="input-label">Message (Optional)</label>
						<textarea
							id="join-msg"
							class="textarea"
							rows="4"
							bind:value={joinMessage}
							placeholder="Hi! I have experience with Svelte, TypeScript, and full-stack development. I would love to join your project team and contribute to..."
							maxlength="1000"
						></textarea>
						<span class="char-count">{joinMessage.length}/1000 characters</span>
					</div>

					<div class="modal-actions">
						<Button type="submit" variant="primary" loading={submittingJoin}>
							Send Join Request
						</Button>
						<Button type="button" variant="secondary" onclick={() => (showJoinModal = false)}>
							Cancel
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.project-details-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 32px 16px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.back-link {
		color: var(--color-primary-600, #4f46e5);
		font-size: 0.875rem;
		text-decoration: none;
		font-weight: 500;
	}
	.back-link:hover { text-decoration: underline; }

	/* Hero Workspace (Screenshots 1 & 2 - Tactile 3D Claymorphic Soft UI) */
	.project-hero-workspace {
		background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #ede9fe 100%);
		border-radius: 26px;
		padding: 32px 36px 20px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 12px 36px rgba(99, 102, 241, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.95);
	}

	.hero-top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
	}

	.join-project-coral-btn {
		padding: 8px 22px;
		border-radius: 9999px;
		background: linear-gradient(135deg, #ff7e72 0%, #ff5d52 100%);
		color: #ffffff;
		border: none;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(255, 112, 102, 0.4);
		transition: transform 0.15s ease;
	}
	.join-project-coral-btn:hover { transform: scale(1.03); }

	.status-recruiting { background: #dcfce7; color: #166534; }
	.status-closed { background: #fee2e2; color: #991b1b; }
	.status-capacity { background: #ffffff; color: #374151; border: 1px solid #e2e8f0; }

	/* Centered Identity & Avatar Dock (Screenshot 1) */
	.hero-identity-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
	}

	.lead-avatar-dock-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		margin-bottom: 4px;
	}

	.lead-avatar-circle {
		width: 76px;
		height: 76px;
		border-radius: 50%;
		background: #ffffff;
		border: 4px solid #ffffff;
		box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}
	.lead-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
	.lead-avatar-initials { font-size: 1.5rem; font-weight: 800; color: #4f46e5; }

	.lead-online-dot {
		position: absolute;
		bottom: 4px;
		right: 4px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #10b981;
		border: 2.5px solid #ffffff;
	}

	/* Quick Actions Dock pill docked under avatar (Screenshot 1) */
	.avatar-quick-dock {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.95);
		border-radius: 9999px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		margin-top: -12px;
		z-index: 3;
	}
	.quick-dock-btn {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: none;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		color: #475569;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s ease, transform 0.15s ease;
	}
	.quick-dock-btn:hover { background: #f1f5f9; transform: scale(1.15); }

	/* Sub-Navigation Pill Tabstrip (Screenshot 1) */
	.workspace-nav-tabstrip {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.6);
		flex-wrap: wrap;
	}
	.tabstrip-pill-btn {
		padding: 6px 16px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.6);
		color: #475569;
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.15s ease;
		border: 1px solid rgba(255, 255, 255, 0.8);
	}
	.tabstrip-pill-btn:hover { background: #ffffff; color: #1e293b; }
	.tabstrip-pill-btn.active {
		background: #ffffff;
		color: #4f46e5;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}
	.tabstrip-pill-btn.highlight {
		background: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}

	/* Milestone Progression Roadmap (Screenshot 1) */
	.milestone-roadmap-card {
		padding: 24px 28px;
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #ffffff;
	}
	.roadmap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.roadmap-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.roadmap-title {
		font-size: 1.0625rem;
		font-weight: 700;
		margin: 0;
	}
	.roadmap-current-status {
		font-size: 0.75rem;
		font-weight: 700;
		color: #4f46e5;
		background: #eef2ff;
		padding: 4px 10px;
		border-radius: 9999px;
	}

	.milestone-steps-track {
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: relative;
		padding: 12px 0 4px;
	}
	.milestone-track-line {
		flex: 1;
		height: 3px;
		background: #e2e8f0;
		margin: 0 8px;
	}
	.milestone-track-line.active { background: #10b981; }

	.milestone-step-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
		z-index: 2;
	}
	.step-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 800;
		background: #f1f5f9;
		color: #94a3b8;
		border: 2px solid #e2e8f0;
	}
	.milestone-step-node.completed .step-dot {
		background: #10b981;
		color: #ffffff;
		border-color: #10b981;
	}
	.milestone-step-node.active .step-dot {
		background: #4f46e5;
		color: #ffffff;
		border-color: #4f46e5;
		box-shadow: 0 0 0 4px #e0e7ff;
	}
	.step-info {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.step-title {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #1e293b;
	}
	.step-desc {
		font-size: 0.6875rem;
		color: #94a3b8;
	}

	/* 4 Tactile 3D Metric Boxes (Screenshots 1 & 2) */
	.project-metrics-4grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}
	.mini-stat-clay-box {
		padding: 16px 18px;
		border-radius: 18px;
		background: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 6px 6px 14px rgba(195, 175, 160, 0.18), -6px -6px 14px rgba(255, 255, 255, 0.95);
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.mini-stat-icon { font-size: 1.375rem; }
	.mini-stat-text { display: flex; flex-direction: column; }
	.mini-stat-num { font-size: 1.125rem; font-weight: 800; color: #1e293b; }
	.mini-stat-label { font-size: 0.75rem; font-weight: 600; color: #64748b; }

	/* Deliverables & Readiness Checklist (Screenshot 1) */
	.checklist-card {
		padding: 22px 24px;
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.checklist-items {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.check-item-row {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 8px 12px;
		border-radius: 10px;
		background: #f8fafc;
	}
	.check-item-row.checked {
		background: #f0fdf4;
	}
	.check-icon {
		font-weight: 800;
		color: #94a3b8;
		font-size: 0.9375rem;
	}
	.check-item-row.checked .check-icon {
		color: #16a34a;
	}
	.check-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.check-title {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #1e293b;
	}
	.check-sub {
		font-size: 0.6875rem;
		color: #64748b;
	}

	.badges-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-right-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		padding: 4px 10px;
		border-radius: 9999px;
	}
	.status-planning { background: #e0e7ff; color: #3730a3; }
	.status-active { background: #dcfce7; color: #166534; }
	.status-completed { background: #f3f4f6; color: #374151; }
	.status-on_hold { background: #fef3c7; color: #92400e; }

	.domain-badge {
		font-size: 0.75rem;
		background: var(--color-neutral-100, #f3f4f6);
		color: var(--color-text-secondary);
		padding: 4px 10px;
		border-radius: 9999px;
		font-weight: 500;
	}

	.project-title {
		font-size: 2.25rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 0;
	}

	.project-tagline {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.creator-meta {
		display: flex;
		gap: 16px;
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		flex-wrap: wrap;
	}

	.creator-link {
		color: var(--color-primary-600, #4f46e5);
		text-decoration: none;
		font-weight: 500;
	}
	.creator-link:hover { text-decoration: underline; }

	.project-links-row {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		padding-top: 8px;
	}

	.link-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: var(--radius-md, 8px);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: background 0.15s ease;
	}
	.link-btn.github { background: #24292e; color: white; }
	.link-btn.github:hover { background: #1b1f23; }

	.link-btn.demo {
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
	}
	.link-btn.demo:hover { background: #e0e7ff; }

	.link-btn.docs {
		background: var(--color-neutral-100, #f3f4f6);
		color: var(--color-text-primary);
	}
	.link-btn.docs:hover { background: #e5e7eb; }

	/* Positions Section */
	.positions-section {
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.section-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.section-sub {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 2px 0 0;
	}

	.empty-positions {
		padding: 32px;
		text-align: center;
		color: var(--color-text-tertiary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.positions-list {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.position-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		padding: 18px;
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #f3f4f6);
	}

	.position-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.position-badge-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.role-status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 9999px;
	}
	.role-status-badge.open { background: #dcfce7; color: #166534; }
	.role-status-badge.closed { background: #f3f4f6; color: #4b5563; }

	.slots-info {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.role-title {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
	}

	.role-desc {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.role-skills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.position-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-end;
	}

	.app-count-btn {
		background: none;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
	}
	.app-count-btn:hover { background: #f3f4f6; }

	.toggle-status-btn, .delete-role-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		cursor: pointer;
		text-decoration: underline;
	}
	.toggle-status-btn { color: var(--color-primary-600, #4f46e5); }
	.delete-role-btn { color: var(--color-danger, #ef4444); }

	.project-body-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;
		align-items: start;
	}

	.main-content-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.team-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.team-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.member-count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 8px;
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #e5e7eb);
		border-radius: 9999px;
		color: var(--color-text-secondary);
	}

	.members-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.member-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #f3f4f6);
	}

	.member-avatar {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-primary-100, #e0e7ff);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.member-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-text {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-primary-700, #4338ca);
	}

	.member-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.member-name-row {
		display: flex;
		align-items: baseline;
		gap: 4px;
		flex-wrap: wrap;
	}

	.member-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.member-name:hover { text-decoration: underline; color: var(--color-primary-600, #4f46e5); }

	.member-handle {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.member-role-row {
		display: flex;
		margin-top: 2px;
	}

	.member-role-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--color-neutral-100, #f3f4f6);
		color: var(--color-text-secondary);
	}

	.member-role-badge.role-lead {
		background: #eef2ff;
		color: #4338ca;
	}

	.description-card, .skills-card, .status-meta-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.description-content {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		white-space: pre-line;
	}

	.sidebar-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.skills-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.skill-tag {
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--color-border-subtle, #f3f4f6);
	}
	.meta-row:last-child { border-bottom: none; padding-bottom: 0; }
	.meta-label { color: var(--color-text-tertiary); }
	.meta-value { font-weight: 600; color: var(--color-text-primary); }

	.empty-text {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	/* Modal Backdrop & Card */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.modal-card {
		width: 100%;
		max-width: 560px;
		max-height: 90vh;
		overflow-y: auto;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		background: white;
	}

	.modal-card.wide {
		max-width: 720px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.modal-header h2 { font-size: 1.375rem; font-weight: 700; margin: 0; }
	.modal-sub { font-size: 0.875rem; color: var(--color-text-secondary); margin: 2px 0 0; }

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-text-tertiary);
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}

	/* Applicants body */
	.applicants-body {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.empty-applicants {
		padding: 32px;
		text-align: center;
		color: var(--color-text-tertiary);
	}

	.applicants-list {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.applicant-card {
		padding: 16px;
		border: 1px solid var(--color-border-subtle, #f3f4f6);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.app-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.applicant-profile-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.app-name {
		font-weight: 700;
		font-size: 0.9375rem;
	}

	.app-username {
		font-size: 0.8125rem;
		color: var(--color-primary-600, #4f46e5);
		text-decoration: none;
	}

	.app-status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		padding: 2px 8px;
		border-radius: 9999px;
	}
	.app-status-badge.status-pending { background: #fef3c7; color: #92400e; }
	.app-status-badge.status-accepted { background: #dcfce7; color: #166534; }
	.app-status-badge.status-rejected { background: #fee2e2; color: #991b1b; }

	.app-headline {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.app-cover {
		background: white;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid var(--color-border, #e5e7eb);
	}

	.note-heading {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		display: block;
		margin-bottom: 2px;
	}

	.cover-text {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.4;
	}

	.app-skills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.app-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 6px;
	}

	.submitted-date {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.review-buttons {
		display: flex;
		gap: 8px;
	}

	.accept-btn {
		background: #16a34a;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 4px 12px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.accept-btn:hover { background: #15803d; }

	.reject-btn {
		background: #fee2e2;
		color: #991b1b;
		border: none;
		border-radius: 6px;
		padding: 4px 12px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.reject-btn:hover { background: #fecaca; }

	/* Edit Form */
	.edit-project-form {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

	.input-group { display: flex; flex-direction: column; gap: 6px; }
	.input-label { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); }

	.textarea {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		font-family: inherit;
		font-size: 0.9375rem;
		outline: none;
	}

	.select {
		height: 42px;
		padding: 0 12px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface, #ffffff);
		outline: none;
	}

	.edit-actions { display: flex; gap: 12px; margin-top: 8px; }
	.loading-hero { height: 240px; border-radius: 12px; }

	/* User Role & Status Badges in Hero */
	.user-role-badge {
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 9999px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.user-role-badge.member { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
	.user-role-badge.pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
	.user-role-badge.full { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
	.user-role-badge.closed { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

	/* Applicant Status Banner */
	.applicant-status-banner {
		padding: 24px 28px;
		border-radius: var(--radius-lg, 12px);
		border-left: 5px solid transparent;
	}
	.applicant-status-banner.banner-pending {
		background: #fffbeb;
		border-color: #f59e0b;
	}
	.applicant-status-banner.banner-accepted {
		background: #f0fdf4;
		border-color: #22c55e;
	}
	.applicant-status-banner.banner-rejected {
		background: #fef2f2;
		border-color: #ef4444;
	}

	.banner-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}
	.banner-icon { font-size: 1.5rem; }
	.banner-heading {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text-primary);
	}
	.banner-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0 0 12px;
		line-height: 1.5;
	}
	.banner-quote, .banner-response {
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 8px;
		padding: 10px 14px;
		margin-bottom: 10px;
		font-size: 0.875rem;
	}
	.quote-label, .response-label {
		font-weight: 600;
		display: block;
		margin-bottom: 4px;
		color: var(--color-text-primary);
	}
	.quote-text, .response-text {
		margin: 0;
		color: var(--color-text-secondary);
		font-style: italic;
	}
	.banner-reapply { margin-top: 12px; }

	/* Owner Join Requests Section */
	.join-requests-section {
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.section-title-badge-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.pending-count-pill {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 2px 8px;
		background: #fef3c7;
		color: #92400e;
		border-radius: 9999px;
		border: 1px solid #fde68a;
	}

	.alert-box {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.875rem;
		line-height: 1.4;
	}
	.team-full-notice { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
	.recruitment-closed-notice { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

	.empty-requests {
		padding: 24px;
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.9375rem;
	}

	.requests-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.request-card {
		padding: 20px;
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #e5e7eb);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.request-card.status-accepted {
		border-left: 4px solid #16a34a;
	}
	.request-card.status-rejected {
		border-left: 4px solid #ef4444;
		opacity: 0.8;
	}
	.request-card.status-pending {
		border-left: 4px solid #f59e0b;
	}

	.request-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.applicant-profile-meta {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.applicant-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-primary-100, #e0e7ff);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.applicant-avatar img { width: 100%; height: 100%; object-fit: cover; }
	.avatar-fallback {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-primary-700, #4338ca);
	}
	.applicant-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.applicant-name {
		font-weight: 700;
		color: var(--color-text-primary);
		text-decoration: none;
		font-size: 1rem;
	}
	.applicant-name:hover { text-decoration: underline; }
	.applicant-handle {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		margin-left: 4px;
	}
	.applicant-headline {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.request-status-badge {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: capitalize;
		padding: 3px 10px;
		border-radius: 9999px;
	}
	.badge-pending { background: #fef3c7; color: #92400e; }
	.badge-accepted { background: #dcfce7; color: #166534; }
	.badge-rejected { background: #fee2e2; color: #991b1b; }

	.applicant-skills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.applicant-skill-tag {
		font-size: 0.75rem;
		background: var(--color-neutral-100, #f3f4f6);
		color: var(--color-text-secondary);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.applicant-message-box {
		background: white;
		border: 1px solid var(--color-border-subtle, #e5e7eb);
		border-radius: 6px;
		padding: 10px 14px;
	}
	.msg-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		display: block;
		margin-bottom: 2px;
	}
	.msg-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		line-height: 1.4;
	}

	.request-meta-row {
		display: flex;
		gap: 12px;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}
	.previous-response-box {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		font-style: italic;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.03);
		border-radius: 4px;
	}

	.review-action-area {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 6px;
		border-top: 1px solid var(--color-border-subtle, #e5e7eb);
	}
	.response-input {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		font-size: 0.875rem;
		outline: none;
	}
	.response-input:focus { border-color: var(--color-primary-600, #4f46e5); }
	.review-buttons-row {
		display: flex;
		gap: 8px;
	}
	.accept-join-btn {
		background: #16a34a;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 6px 16px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.accept-join-btn:hover:not(:disabled) { background: #15803d; }
	.accept-join-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.reject-join-btn {
		background: #fee2e2;
		color: #991b1b;
		border: none;
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.reject-join-btn:hover:not(:disabled) { background: #fecaca; }
	.reject-join-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.modal-info-box {
		background: var(--color-primary-50, #eef2ff);
		border: 1px solid var(--color-primary-100, #e0e7ff);
		border-radius: 8px;
		padding: 12px 16px;
		font-size: 0.875rem;
		color: var(--color-primary-800, #3730a3);
		line-height: 1.4;
	}
	.char-count {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-align: right;
		display: block;
		margin-top: 2px;
	}

	@media (max-width: 768px) {
		.project-body-grid { grid-template-columns: 1fr; }
		.form-grid { grid-template-columns: 1fr; }
		.position-row { flex-direction: column; align-items: stretch; }
		.position-actions { align-items: flex-start; }
	}
</style>
