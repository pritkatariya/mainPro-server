import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: isProduction 
        ? process.env.DATABASE_URL 
        : `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log(`✅ Connected to ${isProduction ? 'Neon (Cloud)' : 'Local pgAdmin (DEV)'} successfully!`);
    }
});

export default pool;