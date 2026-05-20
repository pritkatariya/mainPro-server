import pkg from 'pg';
const { Pool } = pkg;

// Neon Cloud ની કનેક્શન લિંક
const connectionString = "postgresql://neondb_owner:npg_1wb8UYBukIsl@ep-aged-cloud-apqsj1a7-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const neonPool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }, // લાઈવ ડેટાબેઝ માટે આ લાઈન ફરજિયાત છે
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// ગ્લોબલ એરર હેન્ડલર
neonPool.on('error', (err) => {
    console.error('⚠️ Neon Cloud Pool unexpected error:', err.message);
});

neonPool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Neon Cloud connection error:', err.stack);
    } else {
        console.log('🌐 Connected to Online Neon PostgreSQL (Gurukul) successfully! 🔥');
        if (client) release();
    }
});

export default neonPool;