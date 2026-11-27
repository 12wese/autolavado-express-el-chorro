import { Router } from 'express';
import { recognizePlateFromImage } from '../controllers/vision.controller';

const router = Router();

router.post('/recognize-plate', recognizePlateFromImage);

export default router;
