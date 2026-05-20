import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4300),
  LOG_LEVEL: z.string().default('info'),
  EMBEDDING_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  VECTOR_STORE: z.enum(['in-memory', 'pgvector']).default('in-memory'),
  PGVECTOR_CONNECTION_STRING: z.string().default(''),
  PGVECTOR_TABLE: z.string().default('route_vectors'),
  ROUTER_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  SEMANTIC_TOP_K: z.coerce.number().int().positive().default(5),
  INTENT_TOP_K: z.coerce.number().int().positive().default(5),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
