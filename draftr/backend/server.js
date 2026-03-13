import express from 'express';
import cors from 'cors';
import championsRouter from './routes/champions.js';
import analyzeRouter from './routes/analyze.js';
import versionRouter from './routes/version.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/champions', championsRouter);
app.use('/api/analyze',   analyzeRouter);
app.use('/api/version',   versionRouter);

app.listen(PORT, () => {
  console.log(`[draftr] backend running on http://localhost:${PORT}`);
});
