import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface IClient extends Document {
  name: string;
  clientId: string;
  clientSecret: string;
  allowedOrigins: string[];
  redirectUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  clientSecret: {
    type: String,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  allowedOrigins: [{
    type: String,
    required: true
  }],
  redirectUrls: [{
    type: String,
    required: true
  }]
}, {
  timestamps: true
});

export default mongoose.model<IClient>('Client', ClientSchema); 