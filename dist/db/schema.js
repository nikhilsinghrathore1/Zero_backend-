"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersTable = exports.tasktable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// TASK TABLE
exports.tasktable = (0, pg_core_1.pgTable)("Tasks", {
    Taskid: (0, pg_core_1.integer)().notNull().primaryKey(), // 🔹 Coming from frontend, so not auto-generated
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.varchar)("description", { length: 255 }),
    deadline: (0, pg_core_1.timestamp)("deadline"),
    staked_amount: (0, pg_core_1.numeric)("staked_amount"),
    userAddress: (0, pg_core_1.varchar)("userAddress", { length: 255 }),
    proof: (0, pg_core_1.text)("proof"),
    verified: (0, pg_core_1.boolean)("verified").default(false),
});
// USERS TABLE
exports.usersTable = (0, pg_core_1.pgTable)("user", {
    userId: (0, pg_core_1.integer)("userId").primaryKey().generatedAlwaysAsIdentity(),
    userAddress: (0, pg_core_1.varchar)("userAddress", { length: 255 }).notNull().unique(),
    badges: (0, pg_core_1.text)("badges").array(),
    streak: (0, pg_core_1.integer)("streak"),
    total_spent: (0, pg_core_1.numeric)("total_spent"),
});
