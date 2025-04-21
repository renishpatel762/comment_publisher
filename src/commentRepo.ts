import cassandraClient from './cassandraDb/cassandraClient';

export async function insertComment(content: string, author: string): Promise<void> {
  const query = `
    INSERT INTO comments (id, content, author, created_at)
    VALUES (uuid(), ?, ?, toTimeStamp(now()))
  `;

  await cassandraClient.execute(query, [content, author], { prepare: true });
}