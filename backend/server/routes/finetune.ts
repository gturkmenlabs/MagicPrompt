import { Router, Request, Response } from 'express';
import { optionalApiKey } from '../middleware/auth';
import { apiRateLimiter, generateRateLimiter } from '../middleware/rateLimit';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import {
  createFineTuneJob,
  deleteFineTunedModel,
  listCustomModels,
  listFineTuneJobs,
} from '../lib/openaiFineTuning';

const router = Router();
const withKey = [optionalApiKey];

router.get('/finetune-jobs', ...withKey, apiRateLimiter, requireAnyAuth, async (_req: Request, res: Response) => {
  try {
    const jobs = await listFineTuneJobs();
    res.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list fine-tune jobs';
    res.status(500).json({ error: message });
  }
});

router.post('/finetune-jobs', ...withKey, generateRateLimiter, requireAnyAuth, async (req: Request, res: Response) => {
  try {
    const { name, baseModel, datasetSize, datasetPath } = req.body ?? {};
    const result = await createFineTuneJob({
      name: typeof name === 'string' ? name : '',
      baseModel: typeof baseModel === 'string' ? baseModel : undefined,
      datasetSize: typeof datasetSize === 'number' ? datasetSize : undefined,
      datasetPath: typeof datasetPath === 'string' ? datasetPath : undefined,
    });

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create fine-tune job';
    res.status(500).json({ error: message });
  }
});

router.get('/custom-models', ...withKey, apiRateLimiter, requireAnyAuth, async (_req: Request, res: Response) => {
  try {
    const models = await listCustomModels();
    res.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list fine-tuned models';
    res.status(500).json({ error: message });
  }
});

router.delete('/custom-models/:modelId', ...withKey, generateRateLimiter, requireAnyAuth, async (req: Request, res: Response) => {
  try {
    const param = req.params.modelId;
    const modelId = Array.isArray(param) ? param[0] : param;
    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }
    await deleteFineTunedModel(modelId);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete fine-tuned model';
    res.status(500).json({ error: message });
  }
});

export default router;
