import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Errors } from '../lib/apiError';

export const validateBody = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error && typeof error === 'object' && 'errors' in error) {
                const details = (error as any).errors.map((e: any) => ({
                    path: e.path.join('.'),
                    message: e.message
                }));
                Errors.validation(details).send(res);
                return;
            }
            Errors.internal('Internal validation error').send(res);
        }
    };
};

export const GenerateRequestSchema = z.object({
    intent: z.string().min(1).max(50000),
    framework: z.string().optional().default('auto'),
    domainId: z.string().optional().default('auto'),
    provider: z.enum(['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'deepseek', 'openai', 'ollama', 'mistral', 'auto']).optional().default('openai'),
    language: z.enum(['tr', 'en']).optional().default('en'),
    outputFormat: z.enum(['auto', 'markdown', 'json', 'numbered', 'table', 'code', 'xml']).optional().default('auto'),
    useSearch: z.boolean().optional().default(false),
    thinkingMode: z.boolean().optional().default(false),
    systemPrompt: z.string().max(20000).optional(),
    styleContext: z.string().max(20000).optional(),
    attachments: z.array(z.object({
        name: z.string().max(255),
        mimeType: z.string().max(255),
        data: z.string().max(10_000_000),
        preview: z.string().max(20_000).optional(),
    })).max(5).optional(),
    contextRules: z.string().optional(),
    openRouterModel: z.string().optional(),
    ollamaMode: z.enum(['local', 'cloud']).optional(),
    ollamaModel: z.string().optional(),
    enrichment: z.object({
        mode: z.enum(['fast', 'deep', 'off']).optional(),
        autoApply: z.boolean().optional()
    }).optional()
});

export const OptimizeRequestSchema = z.object({
    content: z.string().min(1).max(100000),
    provider: z.enum(['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'deepseek', 'openai', 'ollama', 'mistral', 'auto']).optional().default('auto'),
    domainId: z.string().optional(),
    framework: z.string().optional(),
    mode: z.enum(['fast', 'deep']).optional().default('fast'),
    config: z.any().optional()
});

export const EnrichRequestSchema = z.object({
    masterPrompt: z.string().min(1).max(100000),
    domainId: z.string().optional().default('auto'),
    framework: z.string().optional().default('auto'),
    mode: z.enum(['fast', 'deep', 'agent']).optional().default('fast'),
    config: z.any().optional(),
});
