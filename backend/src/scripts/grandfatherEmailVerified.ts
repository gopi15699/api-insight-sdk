/**
 * One-time migration: grandfather pre-existing accounts as email-verified.
 *
 * Accounts created before email verification existed have no `emailVerified`
 * field, so they would otherwise be forced to verify on next login. This sets
 * them to verified. New accounts (created after the feature shipped) already
 * have the field, so they are untouched.
 *
 * Run once:  npx ts-node src/scripts/grandfatherEmailVerified.ts
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../models/User';

const run = async () => {
  await connectDB();
  const res = await User.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true } }
  );
  console.log(`✅ Grandfathered ${res.modifiedCount} existing account(s) as email-verified.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
