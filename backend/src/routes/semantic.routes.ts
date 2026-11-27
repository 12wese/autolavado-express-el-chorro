import { Router } from 'express';
import {
  getSemanticHealth,
  postSemanticQuery,
  postSemanticUpdate,
} from '../controllers/semantic.controller';

const router = Router();

router.get('/health', getSemanticHealth);
router.post('/query', postSemanticQuery);
router.post('/update', postSemanticUpdate);

export default router;
