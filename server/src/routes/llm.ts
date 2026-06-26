import { Router } from 'express';
import { LLMController } from '../controllers/llmController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/settings', LLMController.getSettings);
router.put('/settings', LLMController.saveSettings);
router.post('/dice-commentary', LLMController.diceCommentary);
router.get('/admin/global-settings', requireAdmin, LLMController.getGlobalSettings);
router.put('/admin/global-settings', requireAdmin, LLMController.saveGlobalSettings);
router.get('/prompts', LLMController.getPrompts);
router.patch('/prompts/:key', requireAdmin, LLMController.updatePrompt);
router.post('/matches/:matchId/sessions', LLMController.createSession);
router.post('/sessions/:sessionId/step', LLMController.stepSession);
router.post('/sessions/:sessionId/events', LLMController.appendSessionEvent);
router.post('/sessions/:sessionId/finish', LLMController.finishSession);
router.post('/sessions/:sessionId/mark-saved', LLMController.markSaved);

export default router;
