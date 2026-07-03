#!/usr/bin/env tsx
import { createApp } from './server.js';

const PORT = Number(process.env.PLATFORM_API_PORT ?? 4100);
createApp().listen(PORT, () => {
  console.log(`Platform API listening on http://localhost:${PORT}`);
});
