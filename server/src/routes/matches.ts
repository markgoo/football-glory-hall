import { Router } from 'express';
import { MatchController } from '../controllers/matchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', MatchController.getAllMatches);
router.get('/:id', MatchController.getMatchById);
router.post('/:id/simulate', MatchController.simulateMatch);
router.post('/:id/manual', MatchController.completeManualMatch);
router.get('/:id/statistics', MatchController.getMatchStatistics);
router.delete('/:id', MatchController.deleteMatch);

export default router;
