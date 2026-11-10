<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { positionsApi, ApiClientError, type PositionDetail } from '$lib/api/client';
	import { ui, currentUser } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let position = $state<PositionDetail | null>(null);
	let loading = $state(true);
	let applying = $state(false);
	let error = $state<string | null>(null);

	let coverNote = $state('');
	let skillsInput = $state('');
	let validationErrors = $state<Record<string, string>>({});

	const positionId = $derived(page.params.id);

	onMount(async () => {
		try {
			const res = await positionsApi.get(positionId);
			position = res.data;
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Position not found';
		} finally {
			loading = false;
		}
	});

	function validate(): boolean {
		validationErrors = {};
		if (!coverNote.trim()) {
			validationErrors.coverNote = 'Please write a brief note introducing yourself.';
		} else if (coverNote.trim().length < 10) {
			validationErrors.coverNote = 'Your message should be at least 10 characters.';
		}
		return Object.keys(validationErrors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		applying = true;
		try {
			const relevantSkills = skillsInput
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);

			await positionsApi.apply(positionId, {
				coverNote: coverNote.trim(),
				relevantSkills,
			});

			ui.toast.success('Application submitted', 'The project owner has received your collaboration request!');
			goto('/positions/my-applications');
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				if (err.code === 'ALREADY_APPLIED') {
					ui.toast.error('Already applied', 'You have already submitted an application for this position.');
				} else {
					ui.toast.error('Application failed', err.message);
				}
			} else {
				ui.toast.error('Application failed', 'An unexpected error occurred.');
			}
		} finally {
			applying = false;
		}
	}
</script>

<svelte:head>
	<title>{position ? `Apply for ${position.title} — CollabSphere` : 'Apply for Role'}</title>
</svelte:head>

<div class="apply-container">
	<div class="top-nav">
		<a href="/positions" class="back-link">← Back to Open Roles</a>
	</div>

	{#if loading}
		<div class="skeleton loading-hero"></div>
	{:else if error}
		<div class="card error-card">
			<h2>Unable to load position</h2>
			<p>{error}</p>
			<Button href="/positions" variant="secondary">Back to Positions</Button>
		</div>
	{:else if position && $currentUser && position.createdBy === $currentUser.id}
		<div class="card error-card">
			<h2>You own this position</h2>
			<p>You cannot submit an application to a position you created.</p>
			{#if position.projectId}
				<Button href="/projects/{position.projectId}" variant="primary">Manage Project</Button>
			{:else}
				<Button href="/positions" variant="secondary">Back to Open Roles</Button>
			{/if}
		</div>
	{:else if position}
		<div class="position-summary card">
			<span class="openings-badge">
				{position.slots - position.filledSlots} opening(s) available
			</span>
			<h1 class="role-title">Apply: {position.title}</h1>
			{#if position.projectName}
				<p class="project-line">
					Project: <a href="/projects/{position.projectId}" class="project-link">{position.projectName}</a>
				</p>
			{/if}
			<p class="role-desc">{position.description}</p>

			{#if position.requiredSkills && position.requiredSkills.length > 0}
				<div class="skills-row">
					<span class="skills-label">Required Skills:</span>
					{#each position.requiredSkills as skill}
						<span class="skill-tag">{skill}</span>
					{/each}
				</div>
			{/if}
		</div>

		<form onsubmit={handleSubmit} class="apply-form card">
			<h2 class="form-title">Your Collaboration Application</h2>
			<p class="form-subtitle">Share why you are interested in this role and what technical skills or experience you bring.</p>

			<div class="input-group">
				<label for="coverNote" class="input-label">Introduction & Motivation *</label>
				<textarea
					id="coverNote"
					class="textarea"
					rows="6"
					bind:value={coverNote}
					placeholder="Hi! I would love to contribute to this project. I have experience working with..."
					required
				></textarea>
				{#if validationErrors.coverNote}
					<span class="error-text">{validationErrors.coverNote}</span>
				{/if}
			</div>

			<Input
				label="Highlight Relevant Skills (comma separated)"
				bind:value={skillsInput}
				placeholder="e.g. React, PostgreSQL, Docker"
			/>

			<div class="form-actions">
				<Button type="submit" variant="primary" loading={applying}>Submit Application</Button>
				<a href="/positions" class="cancel-link">Cancel</a>
			</div>
		</form>
	{/if}
</div>

<style>
	.apply-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 32px 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.back-link {
		color: var(--color-primary-600, #4f46e5);
		font-size: 0.875rem;
		text-decoration: none;
		font-weight: 500;
	}
	.back-link:hover { text-decoration: underline; }

	.position-summary, .apply-form {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.openings-badge {
		background: #dcfce7;
		color: #166534;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 9999px;
		align-self: flex-start;
	}

	.role-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 0;
	}

	.project-line {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.project-link {
		color: var(--color-primary-600, #4f46e5);
		font-weight: 600;
		text-decoration: none;
	}
	.project-link:hover { text-decoration: underline; }

	.role-desc {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.skills-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		padding-top: 8px;
	}

	.skills-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		margin-right: 4px;
	}

	.skill-tag {
		font-size: 0.75rem;
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
		padding: 3px 8px;
		border-radius: 4px;
	}

	.form-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.form-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: -8px 0 0;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.textarea {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		font-family: inherit;
		font-size: 0.9375rem;
		outline: none;
		resize: vertical;
	}
	.textarea:focus {
		border-color: var(--color-primary-500, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.error-text {
		font-size: 0.75rem;
		color: var(--color-danger, #ef4444);
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		padding-top: 8px;
	}

	.cancel-link {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.cancel-link:hover { text-decoration: underline; }

	.loading-hero {
		height: 300px;
		border-radius: 12px;
	}
</style>
