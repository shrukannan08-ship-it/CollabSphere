<script lang="ts">
	import { onMount } from 'svelte';
	import { positionsApi, type ApplicationDetail } from '$lib/api/client';
	import { ui } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';

	let applications = $state<ApplicationDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let withdrawingId = $state<string | null>(null);

	async function loadApplications() {
		try {
			const res = await positionsApi.getMyApplications();
			applications = res.data ?? [];
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Failed to load your applications';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadApplications();
	});

	async function handleWithdraw(appId: string) {
		if (!confirm('Are you sure you want to withdraw this application?')) return;
		withdrawingId = appId;
		try {
			await positionsApi.withdrawApplication(appId);
			ui.toast.success('Application withdrawn', 'Your collaboration request has been withdrawn.');
			await loadApplications();
		} catch (err: unknown) {
			ui.toast.error('Withdrawal failed', (err as Error).message ?? 'Unable to withdraw application.');
		} finally {
			withdrawingId = null;
		}
	}
</script>

<svelte:head>
	<title>My Submitted Applications — CollabSphere</title>
</svelte:head>

<div class="my-apps-container">
	<div class="page-header">
		<div>
			<h1 class="page-title">My Applications</h1>
			<p class="page-subtitle">Track the status of your submitted collaboration requests.</p>
		</div>
		<Button href="/positions" variant="primary">Explore Opportunities</Button>
	</div>

	{#if loading}
		<div class="apps-list">
			{#each Array(3) as _}
				<div class="skeleton app-skeleton"></div>
			{/each}
		</div>
	{:else if error}
		<div class="card error-card">
			<p>{error}</p>
			<Button href="/positions" variant="secondary">Browse Open Roles</Button>
		</div>
	{:else if applications.length === 0}
		<div class="card empty-card">
			<div class="empty-icon">📝</div>
			<h3>No applications yet</h3>
			<p>You haven't applied to any project roles yet. Find an interesting project and submit your first request!</p>
			<Button href="/positions" variant="primary">Explore Opportunities</Button>
		</div>
	{:else}
		<div class="apps-list">
			{#each applications as app}
				<div class="app-card card">
					<div class="app-header">
						<div>
							<h2 class="position-title">{app.positionTitle}</h2>
							{#if app.projectName}
								<a href="/projects/{app.projectId}" class="project-link">
									📁 {app.projectName}
								</a>
							{/if}
						</div>
						<div class="status-badge status-{app.status}">
							{app.status.replace('_', ' ')}
						</div>
					</div>

					<div class="note-box">
						<span class="note-label">Your message:</span>
						<p class="note-text">{app.coverNote}</p>
					</div>

					{#if app.relevantSkills && app.relevantSkills.length > 0}
						<div class="skills-row">
							<span class="skills-label">Skills highlighted:</span>
							{#each app.relevantSkills as skill}
								<span class="skill-tag">{skill}</span>
							{/each}
						</div>
					{/if}

					{#if app.reviewerNote}
						<div class="reviewer-feedback">
							<span class="reviewer-title">Owner Feedback:</span>
							<p class="reviewer-note">{app.reviewerNote}</p>
						</div>
					{/if}

					<div class="app-footer">
						<div class="date-info">
							<span class="applied-date">Submitted on {new Date(app.createdAt).toLocaleDateString()}</span>
							{#if app.reviewedAt}
								<span class="reviewed-date">· Reviewed {new Date(app.reviewedAt).toLocaleDateString()}</span>
							{/if}
						</div>
						{#if app.status === 'pending' || app.status === 'under_review'}
							<button
								class="withdraw-btn"
								onclick={() => handleWithdraw(app.id)}
								disabled={withdrawingId === app.id}
							>
								{withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw Request'}
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.my-apps-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 32px 16px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 0 0 4px;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.apps-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.app-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}

	.position-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 4px;
	}

	.project-link {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
		text-decoration: none;
	}
	.project-link:hover { text-decoration: underline; }

	.status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		padding: 4px 10px;
		border-radius: 9999px;
	}
	.status-pending { background: #fef3c7; color: #92400e; }
	.status-under_review { background: #e0e7ff; color: #3730a3; }
	.status-accepted { background: #dcfce7; color: #166534; }
	.status-rejected { background: #fee2e2; color: #991b1b; }

	.note-box {
		background: var(--color-surface-subtle, #f9fafb);
		padding: 12px 16px;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border-subtle, #f3f4f6);
	}

	.note-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		display: block;
		margin-bottom: 4px;
	}

	.note-text {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.5;
	}

	.skills-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}

	.skills-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
	}

	.skill-tag {
		font-size: 0.75rem;
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.reviewer-feedback {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		padding: 12px 16px;
		border-radius: var(--radius-md, 8px);
	}

	.reviewer-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #166534;
		display: block;
		margin-bottom: 4px;
	}

	.reviewer-note {
		font-size: 0.875rem;
		color: #14532d;
		margin: 0;
	}

	.app-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		padding-top: 10px;
		border-top: 1px solid var(--color-border-subtle, #f3f4f6);
		flex-wrap: wrap;
		gap: 8px;
	}

	.date-info {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.withdraw-btn {
		background: none;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.withdraw-btn:hover:not(:disabled) {
		background: #fef2f2;
	}
	.withdraw-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.app-skeleton {
		height: 180px;
		border-radius: 12px;
	}

	.empty-card, .error-card {
		padding: 48px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.empty-icon {
		font-size: 3rem;
	}
</style>
