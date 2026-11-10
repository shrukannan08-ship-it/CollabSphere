<script lang="ts">
	import { onMount } from 'svelte';
	import { positionsApi, type PositionDetail } from '$lib/api/client';
	import { currentUser } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let positions = $state<PositionDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let searchQuery = $state('');
	let skillFilter = $state('');

	async function loadPositions() {
		loading = true;
		error = null;
		try {
			const params: Record<string, string | boolean> = { isOpen: true };
			if (searchQuery.trim()) params.q = searchQuery.trim();
			if (skillFilter.trim()) params.skill = skillFilter.trim();

			const res = await positionsApi.list(params);
			positions = res.data ?? [];
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Failed to load recruitment positions';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadPositions();
	});

	function handleSearch(e: Event) {
		e.preventDefault();
		loadPositions();
	}
</script>

<svelte:head>
	<title>Open Project Positions — CollabSphere</title>
</svelte:head>

<div class="positions-page">
	<div class="page-header">
		<div>
			<h1 class="page-title">Team Recruitment & Roles</h1>
			<p class="page-subtitle">Browse open contributor opportunities and apply to join active student projects.</p>
		</div>
		<div class="header-buttons">
			<Button href="/positions/my-applications" variant="secondary">My Applications</Button>
			<Button href="/projects" variant="primary">Browse Projects</Button>
		</div>
	</div>

	<!-- Search & Filters -->
	<form onsubmit={handleSearch} class="filters-card card">
		<div class="filters-grid">
			<Input
				bind:value={searchQuery}
				placeholder="Search role title, description, or project name..."
			/>
			<Input
				bind:value={skillFilter}
				placeholder="Filter by skill (e.g. React, Python, UI/UX)..."
			/>
			<Button type="submit" variant="secondary">Search</Button>
		</div>
	</form>

	<!-- Positions List -->
	{#if loading}
		<div class="positions-grid">
			{#each Array(4) as _}
				<div class="skeleton position-card-skeleton"></div>
			{/each}
		</div>
	{:else if error}
		<div class="card error-card">
			<p class="error-msg">{error}</p>
			<Button onclick={loadPositions} variant="secondary">Retry</Button>
		</div>
	{:else if positions.length === 0}
		<div class="card empty-card">
			<div class="empty-icon">🤝</div>
			<h3>No open positions found</h3>
			<p>There are currently no open roles matching your search criteria.</p>
			<Button href="/projects" variant="primary">Explore Projects</Button>
		</div>
	{:else}
		<div class="positions-grid">
			{#each positions as pos}
				<div class="position-card card">
					<div class="card-header">
						<div>
							<span class="openings-badge">
								{pos.slots - pos.filledSlots} {pos.slots - pos.filledSlots === 1 ? 'opening' : 'openings'} left
							</span>
							{#if pos.projectName}
								<a href="/projects/{pos.projectId}" class="project-tag">
									📁 {pos.projectName}
								</a>
							{/if}
						</div>
						<span class="posted-date">Posted {new Date(pos.createdAt).toLocaleDateString()}</span>
					</div>

					<h2 class="position-title">{pos.title}</h2>
					<p class="position-desc">{pos.description}</p>

					{#if pos.requiredSkills && pos.requiredSkills.length > 0}
						<div class="skills-wrap">
							<span class="skills-label">Required:</span>
							{#each pos.requiredSkills as skill}
								<span class="skill-badge">{skill}</span>
							{/each}
						</div>
					{/if}

					{#if pos.niceToHave && pos.niceToHave.length > 0}
						<div class="skills-wrap nice-wrap">
							<span class="skills-label">Bonus:</span>
							{#each pos.niceToHave as skill}
								<span class="skill-badge bonus">{skill}</span>
							{/each}
						</div>
					{/if}

					<div class="card-actions">
						<span class="applicants-count">
							👥 {pos.applicationCount ?? 0} {pos.applicationCount === 1 ? 'applicant' : 'applicants'}
						</span>
						{#if $currentUser && pos.createdBy === $currentUser.id}
							<Button href="/projects/{pos.projectId}" variant="secondary">
								Manage in Project →
							</Button>
						{:else}
							<Button href="/positions/{pos.id}/apply" variant="primary">
								Apply for Role →
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.positions-page {
		max-width: 1100px;
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

	.header-buttons {
		display: flex;
		gap: 12px;
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

	.filters-card {
		padding: 20px;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: 2fr 1.5fr auto;
		gap: 12px;
		align-items: center;
	}

	.positions-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.position-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.openings-badge {
		background: #dcfce7;
		color: #166534;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 9999px;
	}

	.project-tag {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
		text-decoration: none;
		margin-left: 8px;
	}
	.project-tag:hover { text-decoration: underline; }

	.posted-date {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.position-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.position-desc {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.skills-wrap {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}

	.skills-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		margin-right: 4px;
	}

	.skill-badge {
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
		padding: 3px 8px;
		border-radius: 4px;
	}

	.skill-badge.bonus {
		background: var(--color-neutral-100, #f3f4f6);
		color: var(--color-text-secondary);
	}

	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 14px;
		border-top: 1px solid var(--color-border-subtle, #f3f4f6);
		margin-top: 4px;
	}

	.applicants-count {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
	}

	.position-card-skeleton {
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

	@media (max-width: 640px) {
		.filters-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
