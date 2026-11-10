import { z } from 'zod';

export const CreatePositionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100).trim(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000).trim(),
  responsibilities: z.string().max(3000).trim().optional().nullable(),
  requiredSkills: z.array(z.string().trim()).min(1, 'At least one skill is required').max(15),
  niceToHave: z.array(z.string().trim()).max(15).optional().default([]),
  slots: z.number().int().min(1, 'Slots must be at least 1').max(50).default(1),
  isOpen: z.boolean().default(true),
});

export const UpdatePositionSchema = CreatePositionSchema.omit({ projectId: true }).partial();

export const ApplyPositionSchema = z.object({
  coverNote: z.string().min(10, 'Cover note must be at least 10 characters').max(2000).trim(),
  relevantSkills: z.array(z.string().trim()).max(15).optional().default([]),
});

export const ReviewApplicationSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'under_review']),
  reviewerNote: z.string().max(1000).trim().optional().nullable(),
});

export const SearchPositionsSchema = z.object({
  q: z.string().optional(),
  skill: z.string().optional(),
  projectId: z.string().uuid().optional(),
  isOpen: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePositionInput = z.infer<typeof CreatePositionSchema>;
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>;
export type ApplyPositionInput = z.infer<typeof ApplyPositionSchema>;
export type ReviewApplicationInput = z.infer<typeof ReviewApplicationSchema>;
export type SearchPositionsInput = z.infer<typeof SearchPositionsSchema>;
