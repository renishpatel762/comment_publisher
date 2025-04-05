import { Client } from 'cassandra-driver';

const contactPoints = process.env.CASSANDRA_CONTACT_POINTS?.split(',') || ['cassandra'];
const localDataCenter = process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter_live_comments';
const keyspace = process.env.CASSANDRA_KEYSPACE || 'live_comments'; //like database

console.log(process.env.PORT)
console.log(contactPoints);


const cassandraClient = new Client({
  contactPoints,
  localDataCenter,
  keyspace
});

export default cassandraClient;