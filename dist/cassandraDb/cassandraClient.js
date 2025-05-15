"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const cassandra_driver_1 = require("cassandra-driver");
const contactPoints = ((_a = process.env.CASSANDRA_CONTACT_POINTS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['cassandra'];
const localDataCenter = process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter_live_comments';
const keyspace = process.env.CASSANDRA_KEYSPACE || 'live_comments'; //like database
console.log(process.env.PORT);
console.log(contactPoints);
const cassandraClient = new cassandra_driver_1.Client({
    contactPoints,
    localDataCenter,
    keyspace
});
exports.default = cassandraClient;
