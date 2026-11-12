import { z } from 'zod';

export const demoLoginSchema = z.object({
  role: z.enum(['lead', 'departing', 'incoming_dev', 'incoming_designer']),
});

export const createCaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  departingMemberName: z.string().min(1, 'Departing member name is required').max(100),
});

export const createSourceSchema = z.object({
  name: z.string().min(1, 'Source name is required').max(200),
  type: z.enum(['notes', 'tasks_csv', 'chat_json', 'repo_export']),
  acl: z.enum(['team', 'leads_only', 'owner_only']).default('team'),
  consentConfirmed: z.boolean().refine((val) => val === true, {
    message: 'Consent is required: you must confirm "I am authorised to use this source".',
  }),
  rawText: z.string().min(1, 'Source content cannot be empty'),
});

export const patchClaimSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit', 'resolve']),
  value: z.string().optional(),
  text: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export const testCitationSchema = z.object({
  caseId: z.string().min(1),
  spanId: z.string().min(1),
  fakeQuote: z.string().min(1),
  claimText: z.string().optional(),
});

export const acknowledgeSchema = z.object({
  versionNumber: z.number().int().min(1),
  question: z.string().optional(),
});

export const askQuestionSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
});
