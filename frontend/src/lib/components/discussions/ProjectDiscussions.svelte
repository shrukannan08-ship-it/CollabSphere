<script lang="ts">
	import { onMount } from 'svelte';
	import {
		discussionsApi,
		ApiClientError,
		type ThreadDetail,
		type ThreadReplyDetail,
	} from '$lib/api/client';
	import { currentUser, ui } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	interface Props {
		projectId: string;
		isProjectOwner: boolean;
	}
	let { projectId, isProjectOwner }: Props = $props();

	let threads = $state<ThreadDetail[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Create Thread state
	let showNewThread = $state(false);
	let newTitle = $state('');
	let newContent = $state('');
	let newPinned = $state(false);
	let postingThread = $state(false);

	// Active viewing thread (with replies)
	let activeThreadId = $state<string | null>(null);
	let activeThread = $state<ThreadDetail | null>(null);
	let loadingThread = $state(false);

	// Reply state
	let replyContent = $state('');
	let postingReply = $state(false);

	// Editing thread/reply state
	let editingThreadId = $state<string | null>(null);
	let editThreadTitle = $state('');
	let editThreadContent = $state('');
	let savingThread = $state(false);

	let editingReplyId = $state<string | null>(null);
	let editReplyContent = $state('');
	let savingReply = $state(false);

	async function loadThreads() {
		loading = true;
		error = null;
		try {
			const res = await discussionsApi.listThreads(projectId);
			threads = res.data ?? [];
		} catch (err: unknown) {
			error = (err as Error).message ?? 'Failed to load project discussions';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadThreads();
	});

	async function handleCreateThread(e: Event) {
		e.preventDefault();
		if (!newTitle.trim() || !newContent.trim()) {
			ui.toast.error('Validation error', 'Title and content are required.');
			return;
		}

		postingThread = true;
		try {
			const res = await discussionsApi.createThread({
				projectId,
				title: newTitle.trim(),
				content: newContent.trim(),
				isPinned: isProjectOwner ? newPinned : false,
			});
			threads = [res.data, ...threads];
			showNewThread = false;
			newTitle = '';
			newContent = '';
			newPinned = false;
			ui.toast.success('Discussion started', 'Your topic has been posted.');
		} catch (err: unknown) {
			ui.toast.error('Failed to post discussion', (err as Error).message);
		} finally {
			postingThread = false;
		}
	}

	async function openThread(threadId: string) {
		activeThreadId = threadId;
		loadingThread = true;
		try {
			const res = await discussionsApi.getThread(threadId);
			activeThread = res.data;
		} catch (err: unknown) {
			ui.toast.error('Failed to load thread details', (err as Error).message);
		} finally {
			loadingThread = false;
		}
	}

	async function handleAddReply(e: Event) {
		e.preventDefault();
		if (!replyContent.trim() || !activeThreadId) return;

		postingReply = true;
		try {
			const res = await discussionsApi.createReply(activeThreadId, replyContent.trim());
			if (activeThread) {
				activeThread.replies = [...(activeThread.replies || []), res.data];
				activeThread.replyCount += 1;
			}
			// update count in list view
			threads = threads.map((t) =>
				t.id === activeThreadId ? { ...t, replyCount: t.replyCount + 1 } : t
			);
			replyContent = '';
			ui.toast.success('Reply posted');
		} catch (err: unknown) {
			ui.toast.error('Failed to post reply', (err as Error).message);
		} finally {
			postingReply = false;
		}
	}

	function startEditThread(thread: ThreadDetail) {
		editingThreadId = thread.id;
		editThreadTitle = thread.title;
		editThreadContent = thread.content;
	}

	async function handleSaveEditThread() {
		if (!editingThreadId || !editThreadTitle.trim() || !editThreadContent.trim()) return;

		savingThread = true;
		try {
			const res = await discussionsApi.updateThread(editingThreadId, {
				title: editThreadTitle.trim(),
				content: editThreadContent.trim(),
			});
			threads = threads.map((t) => (t.id === editingThreadId ? { ...t, ...res.data } : t));
			if (activeThread?.id === editingThreadId) {
				activeThread = { ...activeThread, ...res.data };
			}
			editingThreadId = null;
			ui.toast.success('Thread updated');
		} catch (err: unknown) {
			ui.toast.error('Failed to update thread', (err as Error).message);
		} finally {
			savingThread = false;
		}
	}

	async function handleDeleteThread(threadId: string) {
		if (!confirm('Are you sure you want to delete this discussion thread?')) return;
		try {
			await discussionsApi.deleteThread(threadId);
			threads = threads.filter((t) => t.id !== threadId);
			if (activeThreadId === threadId) {
				activeThreadId = null;
				activeThread = null;
			}
			ui.toast.info('Discussion thread deleted');
		} catch (err: unknown) {
			ui.toast.error('Failed to delete thread', (err as Error).message);
		}
	}

	function startEditReply(reply: ThreadReplyDetail) {
		editingReplyId = reply.id;
		editReplyContent = reply.content;
	}

	async function handleSaveEditReply() {
		if (!editingReplyId || !editReplyContent.trim()) return;

		savingReply = true;
		try {
			const res = await discussionsApi.updateReply(editingReplyId, editReplyContent.trim());
			if (activeThread?.replies) {
				activeThread.replies = activeThread.replies.map((r) =>
					r.id === editingReplyId ? { ...r, ...res.data } : r
				);
			}
			editingReplyId = null;
			ui.toast.success('Reply updated');
		} catch (err: unknown) {
			ui.toast.error('Failed to update reply', (err as Error).message);
		} finally {
			savingReply = false;
		}
	}

	async function handleDeleteReply(replyId: string) {
		if (!confirm('Are you sure you want to delete this reply?')) return;
		try {
			await discussionsApi.deleteReply(replyId);
			if (activeThread?.replies) {
				activeThread.replies = activeThread.replies.filter((r) => r.id !== replyId);
				activeThread.replyCount = Math.max(0, activeThread.replyCount - 1);
			}
			threads = threads.map((t) =>
				t.id === activeThreadId ? { ...t, replyCount: Math.max(0, t.replyCount - 1) } : t
			);
			ui.toast.info('Reply removed');
		} catch (err: unknown) {
			ui.toast.error('Failed to delete reply', (err as Error).message);
		}
	}
</script>

<div class="discussions-container card">
	<div class="discussions-header">
		<div>
			<h2 class="section-title">Project Discussions & Forum</h2>
			<p class="section-subtitle">Collaborate on architecture, exchange ideas, and ask questions.</p>
		</div>
		{#if !showNewThread && !activeThreadId}
			<Button variant="primary" onclick={() => (showNewThread = true)}>
				+ Start Discussion
			</Button>
		{/if}
	</div>

	<!-- New Thread Form -->
	{#if showNewThread}
		<form onsubmit={handleCreateThread} class="new-thread-form">
			<h3 class="form-title">Start a New Discussion</h3>
			<Input
				label="Topic Title *"
				bind:value={newTitle}
				placeholder="e.g. Database schema RFC for auth & permissions"
				required
			/>
			<div class="input-group">
				<label for="newContent" class="input-label">Discussion Details *</label>
				<textarea
					id="newContent"
					class="textarea"
					rows="5"
					bind:value={newContent}
					placeholder="Provide context, references, questions, or ideas for the team..."
					required
				></textarea>
			</div>

			{#if isProjectOwner}
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={newPinned} class="checkbox" />
					<span class="checkbox-text">Pin this discussion to the top</span>
				</label>
			{/if}

			<div class="form-actions">
				<Button type="submit" variant="primary" loading={postingThread}>Post Discussion</Button>
				<Button type="button" variant="secondary" onclick={() => (showNewThread = false)}>Cancel</Button>
			</div>
		</form>
	{/if}

	<!-- Active Thread & Replies View -->
	{#if activeThreadId}
		<div class="active-thread-view">
			<button class="back-to-threads" onclick={() => { activeThreadId = null; activeThread = null; }}>
				← Back to all discussions
			</button>

			{#if loadingThread || !activeThread}
				<div class="skeleton thread-skeleton"></div>
			{:else}
				<div class="thread-full-card">
					{#if editingThreadId === activeThread.id}
						<div class="edit-thread-box">
							<Input label="Edit Title" bind:value={editThreadTitle} required />
							<textarea class="textarea" rows="4" bind:value={editThreadContent}></textarea>
							<div class="edit-btns">
								<Button variant="primary" loading={savingThread} onclick={handleSaveEditThread}>Save</Button>
								<Button variant="secondary" onclick={() => (editingThreadId = null)}>Cancel</Button>
							</div>
						</div>
					{:else}
						<div class="thread-header-meta">
							<div class="thread-author-row">
								<div class="author-badge">
									{activeThread.authorName[0]}
								</div>
								<div>
									<span class="author-name">{activeThread.authorName}</span>
									{#if activeThread.authorUsername}
										<span class="author-handle">@{activeThread.authorUsername}</span>
									{/if}
								</div>
							</div>
							<span class="thread-timestamp">
								{new Date(activeThread.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>

						<h3 class="thread-main-title">{activeThread.title}</h3>
						<p class="thread-main-content">{activeThread.content}</p>

						{#if $currentUser && ($currentUser.id === activeThread.authorId || isProjectOwner)}
							<div class="thread-owner-actions">
								{#if $currentUser.id === activeThread.authorId}
									<button class="action-btn" onclick={() => startEditThread(activeThread!)}>Edit</button>
								{/if}
								<button class="action-btn delete" onclick={() => handleDeleteThread(activeThread!.id)}>Delete</button>
							</div>
						{/if}
					{/if}
				</div>

				<!-- Replies List -->
				<div class="replies-section">
					<h4 class="replies-title">
						Comments & Replies ({activeThread.replies?.length || 0})
					</h4>

					<div class="replies-list">
						{#if !activeThread.replies || activeThread.replies.length === 0}
							<p class="no-replies">No replies yet. Join the conversation below!</p>
						{:else}
							{#each activeThread.replies as reply}
								<div class="reply-card">
									<div class="reply-header">
										<div class="reply-author-row">
											<div class="mini-avatar">{reply.authorName[0]}</div>
											<span class="reply-author">{reply.authorName}</span>
											{#if reply.authorUsername}
												<span class="reply-username">@{reply.authorUsername}</span>
											{/if}
										</div>
										<span class="reply-date">
											{new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
										</span>
									</div>

									{#if editingReplyId === reply.id}
										<div class="edit-reply-box">
											<textarea class="textarea" rows="3" bind:value={editReplyContent}></textarea>
											<div class="edit-btns">
												<Button variant="primary" loading={savingReply} onclick={handleSaveEditReply}>Save</Button>
												<Button variant="secondary" onclick={() => (editingReplyId = null)}>Cancel</Button>
											</div>
										</div>
									{:else}
										<p class="reply-content">{reply.content}</p>

										{#if $currentUser && ($currentUser.id === reply.authorId || isProjectOwner)}
											<div class="reply-actions">
												{#if $currentUser.id === reply.authorId}
													<button class="action-btn" onclick={() => startEditReply(reply)}>Edit</button>
												{/if}
												<button class="action-btn delete" onclick={() => handleDeleteReply(reply.id)}>Delete</button>
											</div>
										{/if}
									{/if}
								</div>
							{/each}
						{/if}
					</div>

					<!-- Post a Reply Form -->
					<form onsubmit={handleAddReply} class="add-reply-form">
						<textarea
							class="textarea"
							rows="3"
							bind:value={replyContent}
							placeholder="Write your response or feedback..."
							required
						></textarea>
						<div class="reply-submit-row">
							<Button type="submit" variant="primary" loading={postingReply}>
								Post Reply
							</Button>
						</div>
					</form>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Threads List View -->
		{#if loading}
			<div class="skeleton-list">
				{#each Array(3) as _}
					<div class="skeleton thread-skeleton"></div>
				{/each}
			</div>
		{:else if error}
			<div class="empty-state">
				<p class="error-msg">{error}</p>
				<Button variant="secondary" onclick={loadThreads}>Retry</Button>
			</div>
		{:else if threads.length === 0}
			<div class="empty-state">
				<span class="empty-icon">💬</span>
				<h3>No discussions yet</h3>
				<p>Start a discussion thread to brainstorm, plan, or ask project questions.</p>
				<Button variant="primary" onclick={() => (showNewThread = true)}>
					Start First Discussion
				</Button>
			</div>
		{:else}
			<div class="threads-list">
				{#each threads as thread}
					<div
						class="thread-item-card"
						role="button"
						tabindex="0"
						onclick={() => openThread(thread.id)}
						onkeydown={(e) => e.key === 'Enter' && openThread(thread.id)}
					>
						<div class="thread-item-top">
							<div class="title-row">
								{#if thread.isPinned}
									<span class="pinned-tag">📌 Pinned</span>
								{/if}
								<h3 class="thread-title">{thread.title}</h3>
							</div>
							<span class="replies-count-badge">
								💬 {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
							</span>
						</div>

						<p class="thread-snippet">{thread.content}</p>

						<div class="thread-item-footer">
							<span class="thread-author">Started by {thread.authorName}</span>
							<span class="thread-date">
								{new Date(thread.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.discussions-container {
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.discussions-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.section-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 2px 0 0;
	}

	.new-thread-form {
		background: var(--color-surface-subtle, #f9fafb);
		padding: 24px;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border, #e5e7eb);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-title {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.textarea {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 8px);
		font-family: inherit;
		font-size: 0.9375rem;
		outline: none;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.checkbox {
		width: 16px;
		height: 16px;
	}
	.checkbox-text {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.form-actions {
		display: flex;
		gap: 12px;
	}

	.threads-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.thread-item-card {
		padding: 20px;
		border: 1px solid var(--color-border-subtle, #f3f4f6);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-subtle, #f9fafb);
		display: flex;
		flex-direction: column;
		gap: 8px;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
	}
	.thread-item-card:hover {
		background: #f5f3ff;
		border-color: #c7d2fe;
		transform: translateY(-1px);
	}

	.thread-item-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pinned-tag {
		font-size: 0.6875rem;
		font-weight: 700;
		background: #fef3c7;
		color: #92400e;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.thread-title {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.replies-count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
		background: white;
		padding: 3px 8px;
		border-radius: 9999px;
		border: 1px solid var(--color-border-subtle, #e5e7eb);
	}

	.thread-snippet {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.thread-item-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		padding-top: 6px;
	}

	/* Active Thread View */
	.active-thread-view {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.back-to-threads {
		background: none;
		border: none;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-primary-600, #4f46e5);
		cursor: pointer;
		align-self: flex-start;
		padding: 0;
	}
	.back-to-threads:hover { text-decoration: underline; }

	.thread-full-card {
		padding: 24px;
		background: var(--color-surface-subtle, #f9fafb);
		border: 1px solid var(--color-border-subtle, #f3f4f6);
		border-radius: var(--radius-md, 8px);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.thread-header-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.thread-author-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.author-badge {
		width: 32px;
		height: 32px;
		background: #e0e7ff;
		color: #4338ca;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
	}

	.author-name {
		font-size: 0.9375rem;
		font-weight: 700;
	}

	.author-handle {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		margin-left: 4px;
	}

	.thread-timestamp {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.thread-main-title {
		font-size: 1.375rem;
		font-weight: 800;
		margin: 0;
	}

	.thread-main-content {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		white-space: pre-line;
		margin: 0;
	}

	.thread-owner-actions, .reply-actions {
		display: flex;
		gap: 12px;
		padding-top: 6px;
	}

	.action-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0;
	}
	.action-btn:hover { text-decoration: underline; }
	.action-btn.delete { color: var(--color-danger, #ef4444); }

	/* Replies */
	.replies-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.replies-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}

	.replies-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.reply-card {
		padding: 16px;
		background: white;
		border: 1px solid var(--color-border-subtle, #f3f4f6);
		border-radius: var(--radius-md, 8px);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.reply-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.reply-author-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mini-avatar {
		width: 24px;
		height: 24px;
		border-radius: 9999px;
		background: #ede9fe;
		color: #6d28d9;
		font-size: 0.75rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reply-author {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.reply-username {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.reply-date {
		font-size: 0.6875rem;
		color: var(--color-text-tertiary);
	}

	.reply-content {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		line-height: 1.5;
		margin: 0;
	}

	.no-replies {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.add-reply-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 8px;
	}

	.reply-submit-row {
		align-self: flex-end;
	}

	.edit-thread-box, .edit-reply-box {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.edit-btns {
		display: flex;
		gap: 8px;
	}

	.thread-skeleton {
		height: 100px;
		border-radius: 8px;
	}

	.empty-state {
		padding: 36px;
		text-align: center;
		color: var(--color-text-tertiary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}
	.empty-icon { font-size: 2.5rem; }
</style>
