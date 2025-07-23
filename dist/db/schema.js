"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersTable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.usersTable = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.integer)().primaryKey().generatedAlwaysAsIdentity(),
    title: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    description: (0, pg_core_1.varchar)({ length: 255 }), // optional: add length
    deadline: (0, pg_core_1.timestamp)(),
    staked_amount: (0, pg_core_1.numeric)(), // allows decimal values
    userAddress: (0, pg_core_1.varchar)({ length: 255 }) // fixed from `string()` to `varchar()`
});
