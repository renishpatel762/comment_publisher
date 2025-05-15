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
exports.insertComment = insertComment;
const cassandraClient_1 = __importDefault(require("./cassandraDb/cassandraClient"));
function insertComment(content, author) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = `
    INSERT INTO comments (id, content, author, created_at)
    VALUES (uuid(), ?, ?, toTimeStamp(now()))
  `;
        yield cassandraClient_1.default.execute(query, [content, author], { prepare: true });
    });
}
