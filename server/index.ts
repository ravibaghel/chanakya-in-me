import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createApiRouter } from './api';
import { createRuntimeAdapter, readRuntimeConfig } from './runtimeAdapters';

dotenv.config();

const app = express();
const port = Number(process.env.LOCALCOACH_PORT ?? 4317);
const runtimeConfig = readRuntimeConfig();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', createApiRouter(createRuntimeAdapter(runtimeConfig)));

app.listen(port, () => {
  console.log(`LocalCoach AI API running at http://127.0.0.1:${port}`);
});
