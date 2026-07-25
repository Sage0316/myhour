import { z } from 'zod';

export const installationHeaders = {
  installationId: 'x-hakku-installation-id',
  requestId: 'x-hakku-request-id',
} as const;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export const apiSuccessSchema = <T extends z.ZodType>(data: T) => z.object({
  ok: z.literal(true),
  data,
});

export type ApiError = z.infer<typeof apiErrorSchema>;
