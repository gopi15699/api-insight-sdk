/**
 * Vercel serverless entry point.
 *
 * The Express app is a valid (req, res) handler, so Vercel can invoke it
 * directly. `src/index.ts` detects `process.env.VERCEL` and skips app.listen(),
 * so importing it here does not start a second HTTP server.
 */
import app from '../src/index';

export default app;
