import express from 'express';

import { mountRoutes } from './routes.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  mountRoutes(app);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}
