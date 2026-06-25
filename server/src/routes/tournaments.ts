import { Router } from 'express';
import { TournamentController } from '../controllers/tournamentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', TournamentController.getAllTournaments);
router.post('/team-pool', TournamentController.getTeamPool);
router.get('/:id', TournamentController.getTournamentById);
router.post('/', TournamentController.createTournament);
router.put('/:id', TournamentController.updateTournament);
router.delete('/:id', TournamentController.deleteTournament);
router.post('/:id/start', TournamentController.startTournament);

export default router;
