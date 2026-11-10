import { z } from 'zod';

export const CreateThreadSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200).trim(),
  content: z.string().min(5, 'Content must be at least 5 characters').max(10000).trim(),
  isPinned: z.boolean().optional().default(false),
});

export const UpdateThreadSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  content: z.string().min(5).max(10000).trim().optional(),
  isPinned: z.boolean().optional(),
});

export const CreateReplySchema = z.object({
  content: z.string().min(1, 'Reply content cannot be empty').max(5000).trim(),
  parentId: z.string().uuid().optional().nullable(),
});

export const UpdateReplySchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

export const SearchThreadsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type UpdateThreadInput = z.infer<typeof UpdateThreadSchema>;
export type CreateReplyInput = z.infer<typeof CreateReplySchema>;
export type UpdateReplyInput = z.infer<typeof UpdateReplySchema>;
export type SearchThreadsInput = z.infer<typeof SearchThreadsSchema>;
