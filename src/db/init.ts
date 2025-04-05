import { Client } from 'cassandra-driver';
import fs from 'fs';
import path from 'path';

export async function runMigration() {
  const client = new Client({
    contactPoints: process.env.CASSANDRA_CONTACT_POINTS?.split(',') || ['cassandra'],
    localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter_live_comments',
  });

  try {
    await client.connect();
    console.log('✅ Connected to Cassandra for migration');

    const cql = fs.readFileSync(path.join(__dirname, '../../migrations/001_create_keyspace_and_tables.cql'), 'utf8');
    const statements = cql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const stmt of statements) {
      console.log(`🔄 Executing: ${stmt}`);
      await client.execute(stmt);
    }

    console.log('✅ Keyspace and tables created (if not already)');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.shutdown();
  }
}
