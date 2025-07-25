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
  Taskid: integer().notNull().primaryKey(), // 🔹 Coming from frontend, so not auto-generated
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  deadline: timestamp("deadline"),
  staked_amount: numeric("staked_amount"),
  userAddress: varchar("userAddress", { length: 255 }),
  proof: text("proof"),
  verified: boolean("verified").default(false),
});

// USERS TABLE
export const usersTable = pgTable("user", {
  userId: integer("userId").primaryKey().generatedAlwaysAsIdentity(),
  userAddress: varchar("userAddress", { length: 255 }).notNull().unique(),
  badges: text("badges").array(),
  streak: integer("streak"),
  total_spent: numeric("total_spent"),
});
