-- Create keyspace if it doesn't exist
CREATE KEYSPACE IF NOT EXISTS live_comments
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

-- Create comments table
CREATE TABLE IF NOT EXISTS live_comments.comments (
  id UUID PRIMARY KEY,
  content TEXT,
  author TEXT,
  created_at TIMESTAMP
);
