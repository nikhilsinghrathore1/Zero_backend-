"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersTable = exports.tasktable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// TASK TABLE
exports.tasktable = (0, pg_core_1.pgTable)("Tasks", {
    Taskid: (0, pg_core_1.integer)().primaryKey().generatedAlwaysAsIdentity(),
    title: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    description: (0, pg_core_1.varchar)({ length: 255 }),
    deadline: (0, pg_core_1.timestamp)(),
    staked_amount: (0, pg_core_1.numeric)(),
    userAddress: (0, pg_core_1.varchar)({ length: 255 }),
    proof: (0, pg_core_1.text)(),
    verified: (0, pg_core_1.boolean)().default(false),
});
// USERS TABLE
exports.usersTable = (0, pg_core_1.pgTable)("user", {
    userId: (0, pg_core_1.integer)().primaryKey().generatedAlwaysAsIdentity(),
    userAddress: (0, pg_core_1.varchar)({ length: 255 }).notNull().unique(),
    badges: (0, pg_core_1.text)().array(), // ✅ correct array syntax for pg-core
    streak: (0, pg_core_1.integer)(),
    total_spent: (0, pg_core_1.numeric)(),
});
