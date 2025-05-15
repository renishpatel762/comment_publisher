"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = runMigration;
const cassandra_driver_1 = require("cassandra-driver");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function runMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const client = new cassandra_driver_1.Client({
            contactPoints: ((_a = process.env.CASSANDRA_CONTACT_POINTS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['cassandra'],
            localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter_live_comments',
        });
        try {
            yield client.connect();
            console.log('✅ Connected to Cassandra for migration');
            const cql = fs_1.default.readFileSync(path_1.default.join(__dirname, '../../migrations/001_create_keyspace_and_tables.cql'), 'utf8');
            const statements = cql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            for (const stmt of statements) {
                console.log(`🔄 Executing: ${stmt}`);
                yield client.execute(stmt);
            }
            console.log('✅ Keyspace and tables created (if not already)');
        }
        catch (err) {
            console.error('❌ Migration failed:', err);
        }
        finally {
            yield client.shutdown();
        }
    });
}
