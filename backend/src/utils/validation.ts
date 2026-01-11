// backend/src/utils/validation.ts
import { ZodSchema } from 'zod';

export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return result.data;
}

export function asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}