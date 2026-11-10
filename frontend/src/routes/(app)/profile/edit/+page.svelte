<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore, currentProfile, ui } from '$lib/stores/auth';
	import { usersApi, ApiClientError, type Skill } from '$lib/api/client';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form fields
	let fullName = $state('');
	let headline = $state('');
	let bio = $state('');
	let institution = $state('');
	let department = $state('');
	let degree = $state('');
	let yearOfStudy = $state<number | ''>('');
	let graduationYear = $state<number | ''>('');
	let city = $state('');
	let country = $state('');
	let githubUrl = $state('');
	let linkedinUrl = $state('');
	let portfolioUrl = $state('');
	let websiteUrl = $state('');
	let openToCollaborate = $state(true);
	let isPublic = $state(true);

	// Skill addition
	let newSkillName = $state('');
	let newSkillLevel = $state<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
	let addingSkill = $state(false);
	let skills = $state<Skill[]>([]);

	let initialized = false;
	$effect(() => {
		if ($currentProfile && !initialized) {
			initialized = true;
			const p = $currentProfile;
			fullName = p.fullName || '';
			headline = p.headline || '';
			bio = p.bio || '';
			institution = p.institution || '';
			department = p.department || '';
			degree = p.degree || '';
			yearOfStudy = p.yearOfStudy ?? '';
			graduationYear = p.graduationYear ?? '';
			city = p.city || '';
			country = p.country || '';
			githubUrl = p.githubUrl || '';
			linkedinUrl = p.linkedinUrl || '';
			portfolioUrl = p.portfolioUrl || '';
			websiteUrl = p.websiteUrl || '';
			openToCollaborate = p.openToCollaborate ?? true;
			isPublic = p.isPublic ?? true;
			skills = p.skills ? [...p.skills] : [];
		}
	});

	function validate(): boolean {
		errors = {};
		if (!fullName.trim()) errors.fullName = 'Full name is required';
		if (githubUrl && !/^https?:\/\//i.test(githubUrl)) {
			errors.githubUrl = 'URL must start with http:// or https://';
		}
		if (linkedinUrl && !/^https?:\/\//i.test(linkedinUrl)) {
			errors.linkedinUrl = 'URL must start with http:// or https://';
		}
		if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) {
			errors.portfolioUrl = 'URL must start with http:// or https://';
		}
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		saving = true;
		try {
			const res = await usersApi.updateMe({
				fullName: fullName.trim(),
				headline: headline.trim() || null,
				bio: bio.trim() || null,
				institution: institution.trim() || null,
				department: department.trim() || null,
				degree: degree.trim() || null,
				yearOfStudy: yearOfStudy !== '' ? Number(yearOfStudy) : null,
				graduationYear: graduationYear !== '' ? Number(graduationYear) : null,
				city: city.trim() || null,
				country: country.trim() || null,
				githubUrl: githubUrl.trim() || null,
				linkedinUrl: linkedinUrl.trim() || null,
				portfolioUrl: portfolioUrl.trim() || null,
				websiteUrl: websiteUrl.trim() || null,
				openToCollaborate,
				isPublic,
			});
			authStore.setProfile(res.data);
			ui.toast.success('Profile updated', 'Your changes have been saved.');
			if ($currentProfile?.username) {
				goto(`/profile/${$currentProfile.username}`);
			} else {
				goto('/dashboard');
			}
		} catch (err) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Update failed', err.message);
			} else {
				ui.toast.error('Update failed', 'An unexpected error occurred.');
			}
		} finally {
			saving = false;
		}
	}

	async function handleAddSkill(e: Event) {
		e.preventDefault();
		if (!newSkillName.trim()) return;

		addingSkill = true;
		try {
			const res = await usersApi.addSkill({
				skillName: newSkillName.trim(),
				level: newSkillLevel,
			});
			skills = res.data;
			await authStore.refreshProfile();
			newSkillName = '';
			ui.toast.success('Skill added', 'Skill successfully added to profile.');
		} catch (err) {
			if (err instanceof ApiClientError) {
				ui.toast.error('Could not add skill', err.message);
			} else {
				ui.toast.error('Could not add skill', 'Unable to add skill.');
			}
		} finally {
			addingSkill = false;
		}
	}

	async function handleRemoveSkill(skillId: string) {
		try {
			await usersApi.removeSkill(skillId);
			skills = skills.filter((s) => s.id !== skillId);
			await authStore.refreshProfile();
			ui.toast.info('Skill removed');
		} catch (err) {
			ui.toast.error('Failed to remove skill');
		}
	}
</script>

<svelte:head>
	<title>Edit Profile — CollabSphere</title>
</svelte:head>

<div class="edit-profile-container">
	<div class="header-section">
		<a href="/dashboard" class="back-link">← Back to Dashboard</a>
		<h1 class="page-title">Edit Profile</h1>
		<p class="page-subtitle">Keep your education, skills, and links up to date so collaborators can find you.</p>
	</div>

	<form onsubmit={handleSubmit} class="edit-form card">
		<!-- Basic Info -->
		<section class="form-section">
			<h2 class="section-title">Personal Details</h2>
			<div class="form-grid">
				<Input
					label="Full Name *"
					bind:value={fullName}
					error={errors.fullName}
					placeholder="Full Name"
					required
				/>
				<Input
					label="Headline"
					bind:value={headline}
					placeholder="CS Undergrad | Full-Stack Enthusiast"
				/>
			</div>

			<div class="input-group">
				<label for="bio" class="input-label">Bio / About</label>
				<textarea
					id="bio"
					class="textarea"
					rows="4"
					bind:value={bio}
					placeholder="Tell others about your interests, what you like building, and what projects you are looking for..."
				></textarea>
			</div>
		</section>

		<!-- Education -->
		<section class="form-section">
			<h2 class="section-title">Education & Location</h2>
			<div class="form-grid">
				<Input
					label="Institution / University"
					bind:value={institution}
					placeholder="e.g. Stanford University"
				/>
				<Input
					label="Department / Major"
					bind:value={department}
					placeholder="e.g. Computer Science"
				/>
				<Input
					label="Degree"
					bind:value={degree}
					placeholder="e.g. B.S., M.S."
				/>
				<div class="form-grid-inner">
					<Input
						label="Year of Study"
						type="number"
						bind:value={yearOfStudy}
						placeholder="e.g. 3"
						min="1"
						max="8"
					/>
					<Input
						label="Graduation Year"
						type="number"
						bind:value={graduationYear}
						placeholder="e.g. 2026"
						min="2020"
						max="2040"
					/>
				</div>
				<Input
					label="City"
					bind:value={city}
					placeholder="e.g. San Francisco"
				/>
				<Input
					label="Country"
					bind:value={country}
					placeholder="e.g. United States"
				/>
			</div>
		</section>

		<!-- Social Links -->
		<section class="form-section">
			<h2 class="section-title">Links & Portfolio</h2>
			<div class="form-grid">
				<Input
					label="GitHub URL"
					bind:value={githubUrl}
					error={errors.githubUrl}
					placeholder="https://github.com/username"
				/>
				<Input
					label="LinkedIn URL"
					bind:value={linkedinUrl}
					error={errors.linkedinUrl}
					placeholder="https://linkedin.com/in/username"
				/>
				<Input
					label="Portfolio URL"
					bind:value={portfolioUrl}
					error={errors.portfolioUrl}
					placeholder="https://yourportfolio.dev"
				/>
				<Input
					label="Personal Website"
					bind:value={websiteUrl}
					placeholder="https://yourwebsite.com"
				/>
			</div>
		</section>

		<!-- Preferences -->
		<section class="form-section">
			<h2 class="section-title">Collaboration & Visibility</h2>
			<div class="checkbox-group">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={openToCollaborate} class="checkbox" />
					<div>
						<span class="checkbox-title">Open to Collaborate</span>
						<p class="checkbox-desc">Show a badge on your profile and appear in collaborator searches.</p>
					</div>
				</label>
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={isPublic} class="checkbox" />
					<div>
						<span class="checkbox-title">Public Profile</span>
						<p class="checkbox-desc">Allow students outside your immediate connections to view your full profile.</p>
					</div>
				</label>
			</div>
		</section>

		<div class="form-actions">
			<Button type="submit" variant="primary" loading={saving}>Save Changes</Button>
			<a href="/dashboard" class="cancel-btn">Cancel</a>
		</div>
	</form>

	<!-- Skills Section -->
	<div class="skills-card card">
		<h2 class="section-title">Skills & Competencies</h2>
		<p class="skills-subtitle">Showcase your technical capabilities to prospective project teams.</p>

		<form onsubmit={handleAddSkill} class="add-skill-form">
			<Input
				bind:value={newSkillName}
				placeholder="Skill name (e.g. TypeScript, React, PyTorch)"
			/>
			<select bind:value={newSkillLevel} class="skill-select">
				<option value="beginner">Beginner</option>
				<option value="intermediate">Intermediate</option>
				<option value="advanced">Advanced</option>
				<option value="expert">Expert</option>
			</select>
			<Button type="submit" variant="secondary" loading={addingSkill}>Add Skill</Button>
		</form>

		<div class="skills-list">
			{#if skills.length === 0}
				<p class="empty-skills">No skills added yet. Add your first skill above!</p>
			{:else}
				{#each skills as skill}
					<div class="skill-pill">
						<span class="skill-name">{skill.name}</span>
						<span class="skill-badge badge-{skill.level}">{skill.level}</span>
						<button
							type="button"
							class="remove-skill-btn"
							onclick={() => handleRemoveSkill(skill.id)}
							aria-label="Remove skill"
						>
							&times;
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.edit-profile-container {
		max-width: 860px;
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

	.edit-form, .skills-card {
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

	.form-grid-inner {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
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
		transition: border-color var(--transition-fast, 0.15s ease);
	}

	.textarea:focus {
		border-color: var(--color-primary-500, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 16px;
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
		cursor: pointer;
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
		padding-top: 8px;
	}

	.cancel-btn {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.cancel-btn:hover {
		color: var(--color-text-primary);
		text-decoration: underline;
	}

	.skills-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: -16px 0 0;
	}

	.add-skill-form {
		display: grid;
		grid-template-columns: 1fr 160px auto;
		gap: 12px;
		align-items: flex-end;
	}

	.skill-select {
		height: 42px;
		padding: 0 12px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface, #ffffff);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		outline: none;
	}

	.skills-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-height: 40px;
	}

	.empty-skills {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.skill-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--color-neutral-100, #f3f4f6);
		padding: 6px 12px;
		border-radius: var(--radius-full, 9999px);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.skill-badge {
		font-size: 0.75rem;
		text-transform: capitalize;
		padding: 2px 6px;
		border-radius: 4px;
	}
	.badge-beginner { background: #e0f2fe; color: #0369a1; }
	.badge-intermediate { background: #ede9fe; color: #6d28d9; }
	.badge-advanced { background: #dcfce7; color: #15803d; }
	.badge-expert { background: #fef3c7; color: #b45309; }

	.remove-skill-btn {
		background: none;
		border: none;
		font-size: 1.125rem;
		line-height: 1;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0 2px;
	}
	.remove-skill-btn:hover {
		color: var(--color-danger, #ef4444);
	}

	@media (max-width: 640px) {
		.form-grid, .form-grid-inner, .add-skill-form {
			grid-template-columns: 1fr;
		}
	}
</style>