import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { authMiddleware } from './middlewares/auth.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import catalogRoutes from './routes/catalog.routes';
import semanticRoutes from './routes/semantic.routes';
import visionRoutes from './routes/vision.routes';
import washesRoutes from './routes/washes.routes';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:8080';

app.use(helmet());
app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '7mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware);
app.use('/api', catalogRoutes);
app.use('/api/washes', washesRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/semantic', semanticRoutes);
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
