<script lang="ts">
	import { onMount } from 'svelte';
	import { usersApi, type StudentProfile } from '$lib/api/client';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let students = $state<StudentProfile[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let searchQuery = $state('');
	let skillFilter = $state('');
	let institutionFilter = $state('');

	async function loadStudents() {
		loading = true;
		error = null;
		try {
			const params: Record<string, string> = {};
			if (searchQuery.trim()) params.q = searchQuery.trim();
			if (skillFilter.trim()) params.skill = skillFilter.trim();
			if (institutionFilter.trim()) params.institution = institutionFilter.trim();

			const res = await usersApi.search(params);
			students = res.data ?? [];
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Failed to load students';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStudents();
	});

	function handleSearch(e: Event) {
		e.preventDefault();
		loadStudents();
	}

	function getInitials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>Discover Students & Collaborators — CollabSphere</title>
</svelte:head>

<div class="discover-page">
	<div class="page-header">
		<div>
			<h1 class="page-title">Discover Peers</h1>
			<p class="page-subtitle">Find fellow students with matching skills, interests, and collaborative projects.</p>
		</div>
	</div>

	<!-- Search & Filters -->
	<form onsubmit={handleSearch} class="filters-card card">
		<div class="filters-grid">
			<Input
				bind:value={searchQuery}
				placeholder="Search by name, headline, bio..."
			/>
			<Input
				bind:value={skillFilter}
				placeholder="Filter by skill (e.g. Python, React, PyTorch)..."
			/>
			<Input
				bind:value={institutionFilter}
				placeholder="Filter by university / institution..."
			/>
			<Button type="submit" variant="secondary">Filter Peers</Button>
		</div>
	</form>

	<!-- Students Grid -->
	{#if loading}
		<div class="students-grid">
			{#each Array(6) as _}
				<div class="skeleton student-card-skeleton"></div>
			{/each}
		</div>
	{:else if error}
		<div class="card error-card">
			<p class="error-msg">{error}</p>
			<Button onclick={loadStudents} variant="secondary">Retry</Button>
		</div>
	{:else if students.length === 0}
		<div class="card empty-card">
			<div class="empty-icon">🎓</div>
			<h3>No students found</h3>
			<p>Try clearing or broadening your search filters to find active student collaborators.</p>
		</div>
	{:else}
		<div class="students-grid">
			{#each students as student}
				<a href="/profile/{student.username}" class="student-card card">
					<div class="card-top">
						<div class="avatar avatar-lg">
							{#if student.avatarUrl}
								<img src={student.avatarUrl} alt={student.fullName} />
							{:else}
								{getInitials(student.fullName)}
							{/if}
						</div>
						{#if student.openToCollaborate}
							<span class="collab-badge">✓ Open to Collab</span>
						{/if}
					</div>

					<div class="student-info">
						<h2 class="student-name">{student.fullName}</h2>
						<p class="student-username">@{student.username}</p>
						{#if student.headline}
							<p class="student-headline">{student.headline}</p>
						{/if}
						{#if student.institution}
							<p class="student-institution">
								🏫 {student.institution}{student.department ? ` · ${student.department}` : ''}
							</p>
						{/if}
					</div>

					{#if student.skills && student.skills.length > 0}
						<div class="skills-tags">
							{#each student.skills.slice(0, 4) as sk}
								<span class="skill-tag">{sk.name}</span>
							{/each}
							{#if student.skills.length > 4}
								<span class="skill-tag more">+{student.skills.length - 4}</span>
							{/if}
						</div>
					{/if}

					<div class="card-footer">
						<span class="view-profile-link">View Portfolio →</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.discover-page {
		max-width: 1200px;
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
		grid-template-columns: 2fr 1.5fr 1.5fr auto;
		gap: 12px;
		align-items: center;
	}

	@media (max-width: 768px) {
		.filters-grid {
			grid-template-columns: 1fr;
		}
	}

	.students-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
	}

	.student-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		text-decoration: none;
		border-radius: var(--radius-xl, 14px);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.student-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.collab-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		background: #dcfce7;
		color: #166534;
		padding: 3px 8px;
		border-radius: 9999px;
	}

	.student-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.student-name {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.student-username {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		margin: 0 0 4px;
	}

	.student-headline {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0 0 4px;
		line-height: 1.4;
	}

	.student-institution {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.skills-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.skill-tag {
		font-size: 0.6875rem;
		background: var(--color-primary-50, #eef2ff);
		color: var(--color-primary-700, #4338ca);
		padding: 2px 8px;
		border-radius: 4px;
		font-weight: 500;
	}
	.skill-tag.more {
		background: #f3f4f6;
		color: #6b7280;
	}

	.card-footer {
		margin-top: auto;
		padding-top: 10px;
		border-top: 1px solid var(--color-border-subtle, #f3f4f6);
	}

	.view-profile-link {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
	}

	.student-card-skeleton {
		height: 220px;
		border-radius: var(--radius-xl, 14px);
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
		font-size: 2.5rem;
	}
</style>
