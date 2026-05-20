import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'DEV',
    password: '5432', // તમારો લોકલ પાસવર્ડ જો હોય તો લખો
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Local Database connection error:', err.stack);
    } else {
        console.log('💻 Connected to Local pgAdmin (DEV) successfully! 🔥');
        if (client) release();
    }
});

export default pool;