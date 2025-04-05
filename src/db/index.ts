import cassandraClient from './cassandraClient';

async function connectDb() {
  try {
    await cassandraClient.connect();
    console.log('✅ Connected to Cassandra');

    const result = await cassandraClient.execute('SELECT release_version FROM system.local');
    console.log('Cassandra version:', result.rows[0].release_version);

    // await cassandraClient.shutdown();
  } catch (error) {
    console.error('❌ Cassandra connection failed:', error);
  }
}

export default connectDb;
