import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { PlanId, BillingCycle } from '../config/plans';

/**
 * Subscription lifecycle, mirroring the Razorpay subscription states we care
 * about. `none` is the default for free-tier accounts that never subscribed.
 */
export type SubscriptionStatus =
  | 'none'
  | 'created'    // subscription created, awaiting first authorised payment
  | 'active'     // paid & current
  | 'past_due'   // a charge failed (Razorpay: halted/pending)
  | 'cancelled'; // cancelled (may still be active until currentPeriodEnd)

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;        // optional — Google users have no password
  googleId?: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  loginAttempts: number;    // consecutive failed logins
  lockUntil?: Date;         // account locked until this timestamp

  // ── Billing ──────────────────────────────────────────────────────────────
  plan: PlanId;
  billingCycle?: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  currentPeriodEnd?: Date;  // access remains until this date even if cancelled

  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, minlength: 6 },
    googleId:     { type: String, sparse: true },
    avatar:       { type: String },
    authProvider:   { type: String, enum: ['local', 'google'], default: 'local' },
    loginAttempts:  { type: Number, default: 0 },
    lockUntil:      { type: Date },

    plan:                   { type: String, enum: ['free', 'pro', 'ultra'], default: 'free' },
    billingCycle:           { type: String, enum: ['monthly', 'yearly'] },
    subscriptionStatus:     { type: String, enum: ['none', 'created', 'active', 'past_due', 'cancelled'], default: 'none' },
    razorpayCustomerId:     { type: String },
    razorpaySubscriptionId: { type: String, index: true },
    currentPeriodEnd:       { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    (ret as unknown as Record<string, unknown>)['password'] = undefined;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
