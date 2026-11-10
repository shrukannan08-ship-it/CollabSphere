<script lang="ts">
	import { goto } from '$app/navigation';
	import { projectsApi, ApiClientError } from '$lib/api/client';
	import { ui } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	let name = $state('');
	let tagline = $state('');
	let description = $state('');
	let domain = $state('Web Dev');
	let status = $state<'planning' | 'active' | 'completed' | 'archived' | 'on_hold'>('planning');
	let githubUrl = $state('');
	let demoUrl = $state('');
	let documentationUrl = $state('');
	let isPublic = $state(true);
	let skillsInput = $state('');
	let teamSize = $state(4);
	let recruitmentStatus = $state<'open' | 'closed'>('open');

	const domains = ['Web Dev', 'Mobile', 'AI/ML', 'Cloud/DevOps', 'Data Science', 'Security', 'EdTech', 'FinTech', 'Other'];

	function validate(): boolean {
		errors = {};
		if (!name.trim()) errors.name = 'Project name is required';
		else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

		if (!description.trim()) errors.description = 'Description is required';
		else if (description.trim().length < 10) errors.description = 'Description must be at least 10 characters';

		if (githubUrl && !/^https?:\/\//i.test(githubUrl)) {
			errors.githubUrl = 'Must start with http:// or https://';
		}
		if (demoUrl && !/^https?:\/\//i.test(demoUrl)) {
			errors.demoUrl = 'Must start with http:// or https://';
		}
		if (documentationUrl && !/^https?:\/\//i.test(documentationUrl)) {
			errors.documentationUrl = 'Must start with http:// or https://';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		saving = true;
		try {
			const requiredSkills = skillsInput
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);

			const res = await projectsApi.create({
				name: name.trim(),
				tagline: tagline.trim() || undefined,
				description: description.trim(),
				domain: domain || undefined,
				status,
				githubUrl: githubUrl.trim() || undefined,
				demoUrl: demoUrl.trim() || undefined,
				documentationUrl: documentationUrl.trim() || undefined,
				isPublic,
				requiredSkills,
				teamSize: Number(teamSize) || 4,
				recruitmentStatus,
			});

			ui.toast.success('Project created', 'Your project has been successfully launched!');
			goto(`/projects/${res.data.id}`);
		} catch (err: unknown) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Failed to create project', err.message);
			} else {
				ui.toast.error('Failed to create project', 'An unexpected error occurred.');
			}
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create New Project — CollabSphere</title>
</svelte:head>

<div class="new-project-container">
	<div class="page-header">
		<a href="/projects" class="back-link">← Back to Projects</a>
		<h1 class="page-title">Create New Project</h1>
		<p class="page-subtitle">Start a new collaboration, set up your project goals, and find teammates.</p>
	</div>

	<form onsubmit={handleSubmit} class="project-form card">
		<section class="form-section">
			<h2 class="section-title">Project Overview</h2>
			<Input
				label="Project Name *"
				bind:value={name}
				error={errors.name}
				placeholder="Project Title"
				required
			/>

			<Input
				label="Tagline (short summary)"
				bind:value={tagline}
				placeholder="Short summary of project goals"
			/>

			<div class="input-group">
				<label for="description" class="input-label">Description *</label>
				<textarea
					id="description"
					class="textarea"
					rows="5"
					bind:value={description}
					placeholder="Describe what your project is about, its objectives, target users, and current milestones..."
					required
				></textarea>
				{#if errors.description}
					<span class="error-text">{errors.description}</span>
				{/if}
			</div>

			<div class="form-grid">
				<div class="input-group">
					<label for="domain" class="input-label">Domain / Category</label>
					<select id="domain" bind:value={domain} class="select">
						{#each domains as d}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</div>

				<div class="input-group">
					<label for="status" class="input-label">Project Status</label>
					<select id="status" bind:value={status} class="select">
						<option value="planning">Planning</option>
						<option value="active">In Progress (Active)</option>
						<option value="completed">Completed (Showcase)</option>
						<option value="on_hold">On Hold</option>
					</select>
				</div>
			</div>
		</section>

		<section class="form-section">
			<h2 class="section-title">Team & Recruitment</h2>
			<div class="form-grid">
				<div class="input-group">
					<label for="teamSize" class="input-label">Target Team Size</label>
					<input
						id="teamSize"
						type="number"
						class="select"
						min="1"
						max="50"
						bind:value={teamSize}
						placeholder="e.g. 4"
					/>
				</div>

				<div class="input-group">
					<label for="recruitmentStatus" class="input-label">Recruitment Status</label>
					<select id="recruitmentStatus" bind:value={recruitmentStatus} class="select">
						<option value="open">🟢 Recruiting (Open for applications)</option>
						<option value="closed">🔴 Recruitment Closed (Team full / paused)</option>
					</select>
				</div>
			</div>
		</section>

		<section class="form-section">
			<h2 class="section-title">Required Skills & Technologies</h2>
			<Input
				label="Skills (comma separated)"
				bind:value={skillsInput}
				placeholder="e.g. React, TypeScript, Python, PyTorch, Figma"
			/>
		</section>

		<section class="form-section">
			<h2 class="section-title">Project Links</h2>
			<div class="form-grid">
				<Input
					label="GitHub Repository URL"
					bind:value={githubUrl}
					error={errors.githubUrl}
					placeholder="https://github.com/org/repo"
				/>
				<Input
					label="Live Demo URL"
					bind:value={demoUrl}
					error={errors.demoUrl}
					placeholder="https://example.com"
				/>
				<Input
					label="Documentation URL"
					bind:value={documentationUrl}
					error={errors.documentationUrl}
					placeholder="https://docs.myproject.com"
				/>
			</div>
		</section>

		<section class="form-section">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={isPublic} class="checkbox" />
				<div>
					<span class="checkbox-title">Make this project public</span>
					<p class="checkbox-desc">Public projects can be discovered and viewed by other students in CollabSphere.</p>
				</div>
			</label>
		</section>

		<div class="form-actions">
			<Button type="submit" variant="primary" loading={saving}>Create Project</Button>
			<a href="/projects" class="cancel-link">Cancel</a>
		</div>
	</form>
</div>

<style>
	.new-project-container {
		max-width: 800px;
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
	.back-link:hover {
		text-decoration: underline;
	}

	.page-title {
		font-size: 1.875rem;
		font-weight: 800;
		color: var(--color-text-primary);
		margin: 8px 0 4px;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.project-form {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.form-section:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
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
		color: var(--color-text-primary);
		background: var(--color-surface, #ffffff);
		outline: none;
		resize: vertical;
	}
	.textarea:focus {
		border-color: var(--color-primary-500, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.select {
		height: 42px;
		padding: 0 12px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface, #ffffff);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		outline: none;
	}

	.error-text {
		font-size: 0.75rem;
		color: var(--color-danger, #ef4444);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		cursor: pointer;
	}

	.checkbox {
		margin-top: 4px;
		width: 18px;
		height: 18px;
		accent-color: var(--color-primary-600, #4f46e5);
	}

	.checkbox-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.checkbox-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 2px 0 0;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.cancel-link {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.cancel-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
