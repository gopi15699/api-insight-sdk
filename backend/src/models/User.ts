import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;        // optional — Google users have no password
  googleId?: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  loginAttempts: number;    // consecutive failed logins
  lockUntil?: Date;         // account locked until this timestamp
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
