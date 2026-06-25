import { Router } from 'express';
import { HistoricalController } from '../controllers/historicalController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', HistoricalController.getAllRecords);
router.get('/user', HistoricalController.getUserRecords);
router.get('/stats', HistoricalController.getGloryHallStats);
router.get('/search', HistoricalController.searchRecords);
router.get('/:id', HistoricalController.getRecordById);
router.post('/', HistoricalController.createRecordFromTournament);

export default router;