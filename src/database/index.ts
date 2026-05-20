import dotenv from 'dotenv';
import localPool from './db.js';
import neonPool from './neon.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

const db = isProduction ? neonPool : localPool;

export default db;