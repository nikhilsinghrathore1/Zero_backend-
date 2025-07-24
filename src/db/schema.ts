import {
  boolean,
  integer,
  pgTable,
  varchar,
  timestamp,
  numeric,
  text,
} from "drizzle-orm/pg-core";

// TASK TABLE
export const tasktable = pgTable("Tasks", {
  Taskid: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }),
  deadline: timestamp(),
  staked_amount: numeric(),
  userAddress: varchar({ length: 255 }),
  proof: text(),
  verified: boolean().default(false),
});

// USERS TABLE
export const usersTable = pgTable("user", {
  userId: integer().primaryKey().generatedAlwaysAsIdentity(),
  userAddress: varchar({ length: 255 }).notNull().unique(),
  badges: text().array(), // ✅ correct array syntax for pg-core
  streak: integer(),
  total_spent: numeric(),
});