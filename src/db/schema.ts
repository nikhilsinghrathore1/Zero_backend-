import { integer, pgTable, varchar, timestamp, numeric } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }), // optional: add length
  deadline: timestamp(),
  staked_amount: numeric(), // allows decimal values
  userAddress: varchar({ length: 255 }) // fixed from `string()` to `varchar()`
});
