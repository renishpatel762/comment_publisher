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
const cassandraClient_1 = __importDefault(require("./cassandraClient"));
function connectDb() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield cassandraClient_1.default.connect();
            console.log('✅ Connected to Cassandra');
            const result = yield cassandraClient_1.default.execute('SELECT release_version FROM system.local');
            console.log('Cassandra version:', result.rows[0].release_version);
            // await cassandraClient.shutdown();
        }
        catch (error) {
            console.error('❌ Cassandra connection failed:', error);
        }
    });
}
exports.default = connectDb;
