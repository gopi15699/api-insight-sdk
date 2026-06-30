import mongoose, { Document, Schema } from 'mongoose';

export type OtpPurpose = 'email_verify' | 'phone_verify';

export interface IOtp extends Document {
  /** Lower-cased email or E.164 phone the code was sent to. */
  destination: string;
  purpose: OtpPurpose;
  /** HMAC-SHA256 of the code — the plaintext is never stored. */
  codeHash: string;
  /** Verification attempts so far (capped to prevent brute force). */
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    destination: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ['email_verify', 'phone_verify'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One active code per destination+purpose — requesting a new one replaces it.
OtpSchema.index({ destination: 1, purpose: 1 }, { unique: true });
// TTL index: Mongo removes documents once expiresAt passes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
