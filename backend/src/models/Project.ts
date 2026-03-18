import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  apiKey: string;
  alertThreshold: number;
  alertEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apiKey: { type: String, required: true, unique: true },
    alertThreshold: { type: Number, default: 10 },
    alertEmail: { type: String },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
