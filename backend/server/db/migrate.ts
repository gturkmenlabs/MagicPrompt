import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from './client';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
    version: number;
    name: string;
    up: (pool: pg.Pool) => Promise<void>;
    down: (pool: pg.Pool) => Promise<void>;
    checksum?: string;
}

async function ensureMigrationsTable(pool: pg.Pool) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations_ts (
      id SERIAL PRIMARY KEY,
      version INTEGER UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      checksum VARCHAR(255),
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrations(pool: pg.Pool): Promise<number[]> {
    const { rows } = await pool.query('SELECT version FROM schema_migrations_ts ORDER BY version ASC');
    return rows.map(r => r.version);
}

async function run() {
    const pool = getPool();
    if (!pool) {
        console.error('Database connection not available. Provide DATABASE_URL or SR_DATABASE_URL.');
        process.exit(1);
    }

    try {
        const isRollback = process.argv.includes('down');

        await ensureMigrationsTable(pool);
        const appliedVars = await getAppliedMigrations(pool);

        const migrationsDir = path.join(__dirname, 'migrations_ts');
        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations_ts directory found.');
            process.exit(0);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.ts'))
            .sort();

        if (isRollback) {
            if (appliedVars.length === 0) {
                console.log('No migrations to rollback.');
                return;
            }
            const lastVersion = appliedVars[appliedVars.length - 1] as number;
            const fileToRollback = files.find(f => f.startsWith(lastVersion.toString().padStart(3, '0')));

            if (!fileToRollback) {
                console.error(`Migration file for version ${lastVersion} not found.`);
                process.exit(1);
            }

            console.log(`Rolling back: ${fileToRollback}`);
            const migrationSource = await import(path.join(migrationsDir, fileToRollback));
            const migration: Migration = migrationSource.default;

            await pool.query('BEGIN');
            try {
                await migration.down(pool);
                await pool.query('DELETE FROM schema_migrations_ts WHERE version = $1', [migration.version]);
                await pool.query('COMMIT');
                console.log(`Rolled back successfully.`);
            } catch (err) {
                await pool.query('ROLLBACK');
                console.error(`Rollback failed for ${migration.name}:`, err);
                process.exit(1);
            }
        } else {
            // UP
            let ranAny = false;
            for (const file of files) {
                const migrationSource = await import(path.join(migrationsDir, file));
                const migration: Migration = migrationSource.default;

                if (appliedVars.includes(migration.version)) {
                    continue;
                }

                console.log(`Applying migration: ${file}`);
                await pool.query('BEGIN');
                try {
                    await migration.up(pool);
                    await pool.query(
                        'INSERT INTO schema_migrations_ts (version, name, checksum) VALUES ($1, $2, $3)',
                        [migration.version, migration.name, migration.checksum || null]
                    );
                    await pool.query('COMMIT');
                    console.log(`Applied successfully.`);
                    ranAny = true;
                } catch (err) {
                    await pool.query('ROLLBACK');
                    console.error(`Migration failed for ${migration.name}:`, err);
                    process.exit(1);
                }
            }

            if (!ranAny) {
                console.log('All migrations are up-to-date.');
            }
        }
    } catch (error) {
        console.error('Migration framework error:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

run();
