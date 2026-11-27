import { Router } from 'express';
import {
  getWashStats,
  getWashById,
  getWashStatusHistory,
  getWashes,
  deleteWashById,
  patchWashStatus,
  postWash,
} from '../controllers/washes.controller';

const router = Router();

router.get('/stats', getWashStats);
router.get('/status-history', getWashStatusHistory);
router.get('/', getWashes);
router.post('/', postWash);
router.get('/:id', getWashById);
router.patch('/:id/status', patchWashStatus);
router.delete('/:id', deleteWashById);

export default router;
