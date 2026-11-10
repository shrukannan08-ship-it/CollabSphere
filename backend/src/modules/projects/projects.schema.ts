import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100).trim().optional(),
  tagline: z.string().max(200).trim().optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000).trim(),
  domain: z.string().max(100).trim().optional().nullable(),
  category: z.string().max(100).trim().optional().nullable(),
  tags: z.array(z.string().trim()).max(10).optional().default([]),
  status: z.enum(['planning', 'active', 'completed', 'archived', 'on_hold']).default('planning'),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  demoUrl: z.string().url('Invalid Demo URL').optional().nullable().or(z.literal('')),
  documentationUrl: z.string().url('Invalid Docs URL').optional().nullable().or(z.literal('')),
  isPublic: z.boolean().default(true),
  requiredSkills: z.array(z.string().trim()).max(20).optional().default([]),
  teamSize: z.coerce.number().int().min(1, 'Team size must be at least 1').max(100).optional().default(4),
  recruitmentStatus: z.enum(['open', 'closed']).default('open'),
}).refine((data) => !!(data.name || data.title), {
  message: 'Project title or name is required',
  path: ['name'],
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100).trim().optional(),
  tagline: z.string().max(200).trim().optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000).trim().optional(),
  domain: z.string().max(100).trim().optional().nullable(),
  category: z.string().max(100).trim().optional().nullable(),
  tags: z.array(z.string().trim()).max(10).optional(),
  status: z.enum(['planning', 'active', 'completed', 'archived', 'on_hold']).optional(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  demoUrl: z.string().url('Invalid Demo URL').optional().nullable().or(z.literal('')),
  documentationUrl: z.string().url('Invalid Docs URL').optional().nullable().or(z.literal('')),
  isPublic: z.boolean().optional(),
  requiredSkills: z.array(z.string().trim()).max(20).optional(),
  teamSize: z.coerce.number().int().min(1, 'Team size must be at least 1').max(100).optional(),
  recruitmentStatus: z.enum(['open', 'closed']).optional(),
});

export const SearchProjectsSchema = z.object({
  q: z.string().optional(),
  domain: z.string().optional(),
  category: z.string().optional(),
  skill: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'archived', 'on_hold']).optional(),
  recruitmentStatus: z.enum(['open', 'closed']).optional(),
  createdBy: z.string().uuid().optional(),
  my: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateJoinRequestSchema = z.object({
  message: z.string().max(1000, 'Message cannot exceed 1000 characters').trim().optional().nullable(),
});

export const ReviewJoinRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  responseMessage: z.string().max(1000, 'Response message cannot exceed 1000 characters').trim().optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type SearchProjectsInput = z.infer<typeof SearchProjectsSchema>;
export type CreateJoinRequestInput = z.infer<typeof CreateJoinRequestSchema>;
export type ReviewJoinRequestInput = z.infer<typeof ReviewJoinRequestSchema>;
