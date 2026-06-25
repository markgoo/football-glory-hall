import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', AdminController.getUsers);
router.patch('/users/:id', AdminController.updateUser);
router.post('/users/:id/reset-password', AdminController.resetPassword);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
