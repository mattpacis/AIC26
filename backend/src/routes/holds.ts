import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import { getHoldSummary, listHolds } from '../services/holdService.js';

export const holdsRouter = Router();

holdsRouter.use(requireAuth, loadAuthContext);

holdsRouter.get('/holds', async (req, res, next) => {
  try {
    const holds = await listHolds(req.auth!);
    res.json({ holds });
  } catch (err) {
    next(err);
  }
});

holdsRouter.get('/holds/summary', async (req, res, next) => {
  try {
    const summary = await getHoldSummary(req.auth!);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});
