import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  headline: z.string().max(160).trim().optional().nullable(),
  bio: z.string().max(2000).trim().optional().nullable(),
  institution: z.string().max(200).trim().optional().nullable(),
  department: z.string().max(200).trim().optional().nullable(),
  degree: z.string().max(200).trim().optional().nullable(),
  yearOfStudy: z.number().int().min(1).max(8).optional().nullable(),
  graduationYear: z.number().int().min(2020).max(2040).optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  country: z.string().max(100).trim().optional().nullable(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  isPublic: z.boolean().optional(),
  openToCollaborate: z.boolean().optional(),
});

export const AddSkillSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID').optional(),
  skillName: z.string().min(1).max(100).trim().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  years: z.number().min(0).max(30).optional().nullable(),
  isPrimary: z.boolean().default(false),
}).refine((data) => data.skillId || data.skillName, {
  message: 'Either skillId or skillName must be provided',
});

export const UpdateSkillSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  years: z.number().min(0).max(30).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const SearchUsersSchema = z.object({
  q: z.string().optional(),
  skills: z.string().optional(), // comma-separated skill IDs or names
  institution: z.string().optional(),
  department: z.string().optional(),
  openToCollaborate: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AddSkillInput = z.infer<typeof AddSkillSchema>;
export type SearchUsersInput = z.infer<typeof SearchUsersSchema>;
