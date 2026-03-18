import mongoose, { Document, Schema } from 'mongoose';

export interface ILog extends Document {
  projectId: mongoose.Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage?: string;
  stackTrace?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  duration?: number;       // ms
  userAgent?: string;
  ip?: string;
  suggestion?: string;     // Root cause suggestion (populated by engine)
  groupKey?: string;       // endpoint:errorMessage hash for grouping
  timestamp: Date;
}

const LogSchema = new Schema<ILog>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true, uppercase: true },
    statusCode: { type: Number, required: true },
    errorMessage: { type: String },
    stackTrace: { type: String },
    requestBody: { type: Schema.Types.Mixed },
    responseBody: { type: Schema.Types.Mixed },
    requestHeaders: { type: Schema.Types.Mixed },
    duration: { type: Number },
    userAgent: { type: String },
    ip: { type: String },
    suggestion: { type: String },
    groupKey: { type: String, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Compound index for grouping queries
LogSchema.index({ projectId: 1, groupKey: 1 });
LogSchema.index({ projectId: 1, statusCode: 1 });
LogSchema.index({ projectId: 1, timestamp: -1 });

export const Log = mongoose.model<ILog>('Log', LogSchema);
