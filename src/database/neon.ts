import pkg from 'pg';
const { Pool } = pkg;

// Neon Cloud ની કનેક્શન લિંક
const connectionString = "postgresql://neondb_owner:npg_1wb8UYBukIsl@ep-aged-cloud-apqsj1a7-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const neonPool = new Pool({
    connectionString: connectionString,
    // 💡 કનેક્શન અચાનક બંધ ન થાય તે માટે આ ખાસ ઓપ્શન્સ ઉમેર્યા છે
    max: 10,                 // એકસાથે વધુમાં વધુ ૧૦ કનેક્શન ઓપન રાખશે
    idleTimeoutMillis: 30000, // જો કનેક્શન આઈડલ હોય તો ૩૦ સેકન્ડ પછી જ બંધ કરશે
    connectionTimeoutMillis: 10000, // કનેક્ટ થવા માટે ૧૦ સેકન્ડ સુધી વેટ કરશે
});

// 🔥 ગ્લોબલ એરર હેન્ડલર (આનાથી જો કનેક્શન ડ્રોપ થશે તો પણ તમારું નોડ સર્વર ક્રેશ નહીં થાય)
neonPool.on('error', (err) => {
    console.error('⚠️ Neon Cloud Pool unexpected error:', err.message);
});

neonPool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Neon Cloud connection error:', err.stack);
    } else {
        console.log('🌐 Connected to Online Neon PostgreSQL (Gurukul) successfully! 🔥');
        if (release) release(); // કનેક્શન ચેક કરીને તરત જ ક્લાયન્ટને પૂલમાં પાછો મુકી દેશે
    }
});

export default neonPool;