import type { Migration } from '../migrate';
import type pg from 'pg';

const migration: Migration = {
    version: 1,
    name: 'Initial test setup',
    up: async (pool: pg.Pool) => {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sample_test_table (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    },
    down: async (pool: pg.Pool) => {
        await pool.query(`DROP TABLE IF EXISTS sample_test_table;`);
    },
    checksum: 'initial_v1',
};

export default migration;
