import type { Express, Request, Response, NextFunction } from 'express';

import {
  platform,
  mesh,
  sgce,
  psom,
  resolveContext,
  sovereignToken,
  parseGovernanceMode,
} from './state.js';

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}

function authRequired(req: Request, res: Response, next: NextFunction): void {
  try {
    req.platformCtx = resolveContext(req);
    next();
  } catch {
    res.status(401).json({ error: 'AUTH: missing or invalid credentials' });
  }
}

export function mountRoutes(app: Express): void {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', organismId: process.env.ORGANISM_ID ?? 'organism-local' });
  });

  // v1 auth
  app.post('/v1/auth/login', (req, res) => {
    const ownerId = String(req.body.ownerId ?? 'developer');
    const profile = parseGovernanceMode(req.body.governanceProfile);
    const session = platform.login(ownerId, profile);
    res.json(session);
  });

  app.post('/v1/auth/keys', authRequired, (req, res) => {
    const label = String(req.body.label ?? 'api-key');
    const profile = parseGovernanceMode(req.body.governanceProfile ?? req.platformCtx!.governanceProfile);
    const result = platform.apiKeys.create({
      label,
      ownerId: req.platformCtx!.ownerId,
      governanceProfile: profile,
    });
    res.status(201).json({ record: { id: result.record.id, keyPrefix: result.record.keyPrefix }, key: result.key });
  });

  app.get('/v1/auth/keys', authRequired, (req, res) => {
    const keys = platform.apiKeys.list(req.platformCtx!.ownerId).map((k) => ({
      id: k.id,
      label: k.label,
      keyPrefix: k.keyPrefix,
      governanceProfile: k.governanceProfile,
      scopes: k.scopes,
      createdAt: k.createdAt,
    }));
    res.json(keys);
  });

  // v1 governance
  app.get('/v1/governance/profiles', (_req, res) => {
    res.json(platform.listProfiles());
  });

  app.get('/v1/governance/drift', (_req, res) => {
    res.json(psom.drift.scan());
  });

  app.get('/v1/governance/compare', (req, res) => {
    const local = parseGovernanceMode(req.query.local);
    const remote = parseGovernanceMode(req.query.remote ?? 'experimental');
    res.json(psom.governance.negotiate(local, remote));
  });

  // v1 capabilities
  app.get('/v1/capabilities', authRequired, (_req, res) => {
    res.json(platform.versions.list());
  });

  app.post('/v1/capabilities/publish', authRequired, (req, res) => {
    const record = platform.publishCapability(req.platformCtx!, {
      id: String(req.body.id),
      name: String(req.body.name),
      description: String(req.body.description ?? ''),
      organId: String(req.body.organId),
      version: String(req.body.version),
      changelog: req.body.changelog as string | undefined,
    });
    sgce.provenance.record({
      capabilityId: record.id,
      version: record.currentVersion,
      publisherId: req.platformCtx!.ownerId,
      governanceTags: (req.body.governanceTags as string[]) ?? [],
    });
    res.status(201).json(record);
  });

  app.post('/v1/capabilities/:capabilityId/invoke', authRequired, (req, res) => {
    const result = platform.invokeCapability(req.platformCtx!, {
      capabilityId: String(req.params.capabilityId),
      version: req.body.version as string | undefined,
      input: (req.body.input as Record<string, unknown>) ?? {},
      traceId: req.body._governance?.traceId as string | undefined,
    });
    res.json(result);
  });

  // v1 billing
  app.get('/v1/billing/usage', authRequired, (req, res) => {
    res.json(platform.meter.summary(req.platformCtx!.ownerId));
  });

  // v1 modules
  app.post('/v1/modules/test', authRequired, (req, res) => {
    const result = platform.testModule(
      req.platformCtx!,
      String(req.body.moduleId),
      String(req.body.version),
    );
    res.json(result);
  });

  // v1 mesh
  app.get('/v1/mesh/discover', (req, res) => {
    const capability = req.query.capability as string | undefined;
    const governanceProfile = req.query.governanceProfile
      ? parseGovernanceMode(req.query.governanceProfile)
      : undefined;
    res.json(mesh.discover({ capability, governanceProfile }));
  });

  app.get('/v1/mesh/topology', (_req, res) => {
    res.json(psom.topology());
  });

  app.post('/v1/mesh/connect', authRequired, (req, res) => {
    const organismId = String(req.body.organismId ?? req.body.nodeId);
    const remote = mesh.discover().find((o) => o.organismId === organismId);
    if (!remote) {
      res.status(404).json({ error: `organism "${organismId}" not discovered` });
      return;
    }
    const token = sovereignToken(req.platformCtx!.ownerId);
    const conn = mesh.connect(
      remote,
      (req.body.scope as string[]) ?? ['capabilities:read', 'capabilities:invoke'],
      token,
      req.platformCtx!.governanceProfile,
    );
    res.status(201).json(conn);
  });

  app.post('/v1/mesh/announce', authRequired, (req, res) => {
    const descriptor = mesh.announce({
      organismId: String(req.body.organismId),
      endpoint: String(req.body.endpoint),
      capabilities: (req.body.capabilities as string[]) ?? [],
      governanceProfile: parseGovernanceMode(req.body.governanceProfile),
      lawHash: String(req.body.lawHash ?? process.env.PLATFORM_LAW_HASH ?? 'platform-law-v1'),
    });
    psom.registry.register({
      nodeId: descriptor.organismId,
      organismId: descriptor.organismId,
      endpoint: descriptor.endpoint,
      governanceProfile: descriptor.governanceProfile,
      capabilities: descriptor.capabilities,
    });
    res.status(201).json(descriptor);
  });

  // v1 workflows
  app.post('/v1/workflows/run', authRequired, (req, res) => {
    const token = sovereignToken(req.platformCtx!.ownerId);
    const result = mesh.routeWorkflow(
      {
        workflowId: `wf_${Date.now().toString(36)}`,
        steps: req.body.steps,
        governanceProfile: req.platformCtx!.governanceProfile,
      },
      token,
    );
    res.json(result);
  });

  // v1 marketplace (SGCE)
  app.get('/v1/marketplace', (req, res) => {
    const profile = req.query.profile ? parseGovernanceMode(req.query.profile) : undefined;
    res.json(sgce.marketplace.search({ governanceProfile: profile }));
  });

  app.post('/v1/marketplace/list', authRequired, (req, res) => {
    const listing = sgce.marketplace.publish({
      capabilityId: String(req.body.capabilityId),
      version: String(req.body.version),
      sellerId: req.platformCtx!.ownerId,
      title: String(req.body.title),
      description: String(req.body.description ?? ''),
      pricingModel: req.body.pricingModel ?? 'subscription',
      priceUnits: Number(req.body.priceUnits ?? 10),
      governanceProfile: parseGovernanceMode(req.body.governanceProfile ?? req.platformCtx!.governanceProfile),
    });
    res.status(201).json(listing);
  });

  // Legacy unversioned aliases
  app.get('/governance/profiles', (_req, res) => res.redirect(307, '/v1/governance/profiles'));
  app.get('/mesh/topology', (_req, res) => res.redirect(307, '/v1/mesh/topology'));
}

declare module 'express-serve-static-core' {
  interface Request {
    platformCtx?: import('@aaes-os/platform-core').PlatformContext;
  }
}

export { asyncHandler, authRequired };
