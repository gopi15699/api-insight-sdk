import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const signToken = (id: string): string =>
  jwt.sign({ id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
