import fs from 'fs';
import path from 'path';
import pool from '../database/start';

const run = async () => {
  try {
    const sqlPath = path.join(process.cwd(), 'db', 'migrations', 'init.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('Migration file not found:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, { encoding: 'utf8' });

    console.log('Running migration SQL...');
    await pool.query(sql);
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err: any) {
    console.error('Migration failed:', err.message || err);
    process.exit(2);
  }
};

run();
