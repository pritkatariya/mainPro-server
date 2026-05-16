import express from 'express';
import cors from 'cors';
import router from './Route/Routes.js';

import pool from './database/db.js';
import neonPool from './database/neon.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/', router);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});