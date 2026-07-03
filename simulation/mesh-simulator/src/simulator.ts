import { PsomMesh } from '@aaes-os/psom-mesh';
import { SgceEconomy } from '@aaes-os/sgce';

export interface SimulatorOptions {
  organismCount?: number;
  messagesPerOrganism?: number;
}

export interface SimulationReport {
  organisms: number;
  messagesSent: number;
  messagesAllowed: number;
  messagesBlocked: number;
  capabilitiesPublished: number;
  quarantined: number;
  driftReports: number;
  durationMs: number;
}

/** Multi-organism mesh simulator with message passing and capability sharing. */
export class MeshSimulator {
  private readonly meshes: PsomMesh[] = [];
  private readonly economies: SgceEconomy[] = [];

  constructor(private readonly options: SimulatorOptions = {}) {}

  setup(): void {
    const count = this.options.organismCount ?? 3;

    for (let i = 0; i < count; i++) {
      const mesh = new PsomMesh({
        nodeId: `sim-node-${i}`,
        organismId: `sim-organism-${i}`,
        endpoint: `http://localhost:${4200 + i}`,
        governanceProfile: i === 0 ? 'strict' : i === count - 1 ? 'experimental' : 'balanced',
      });
      this.meshes.push(mesh);
      this.economies.push(new SgceEconomy());
    }

    for (let i = 0; i < this.meshes.length; i++) {
      for (let j = 0; j < this.meshes.length; j++) {
        if (i === j) continue;
        const target = this.meshes[j]!;
        try {
          this.meshes[i]!.registerPeer({
            nodeId: `sim-node-${j}`,
            organismId: `sim-organism-${j}`,
            endpoint: `http://localhost:${4200 + j}`,
            governanceProfile: j === 0 ? 'strict' : j === this.meshes.length - 1 ? 'experimental' : 'balanced',
            capabilities: [`cap.sim.${j}`],
          });
        } catch {
          // negotiation may fail for strict↔experimental — expected in stress tests
        }
      }
    }
  }

  run(): SimulationReport {
    const start = Date.now();
    let messagesSent = 0;
    let messagesAllowed = 0;
    let messagesBlocked = 0;
    let capabilitiesPublished = 0;

    for (let i = 0; i < this.economies.length; i++) {
      const economy = this.economies[i]!;
      economy.publishCapability({
        id: `cap.sim.${i}`,
        name: `Sim Capability ${i}`,
        description: 'Simulated capability',
        organId: `organ-${i}`,
        ownerId: `owner-${i}`,
        version: '1.0.0',
        governanceProfile: 'balanced',
      });
      capabilitiesPublished += 1;
    }

    const messagesPerOrganism = this.options.messagesPerOrganism ?? 10;

    for (const mesh of this.meshes) {
      const peers = mesh.registry.list().filter((n) => n.nodeId !== mesh.topology().nodes[0]?.nodeId);
      for (let m = 0; m < messagesPerOrganism; m++) {
        const peer = peers[m % peers.length];
        if (!peer) continue;
        messagesSent += 1;
        const result = mesh.sendMessage(
          peer.nodeId,
          m % 2 === 0 ? 'capability' : 'agent',
          { iteration: m },
          `trace-sim-${m}`,
        );
        if (result.allowed) messagesAllowed += 1;
        else messagesBlocked += 1;
      }
    }

    const primary = this.meshes[0]!;
    primary.drift.recordObservation('sim-node-1', 'experimental');
    const driftReports = primary.drift.scan().length;

    primary.quarantine.quarantine({
      capabilityId: 'cap.adversarial',
      sourceNodeId: 'sim-node-2',
      reason: 'adversarial pattern detected',
      trustScore: 0.1,
    });

    return {
      organisms: this.meshes.length,
      messagesSent,
      messagesAllowed,
      messagesBlocked,
      capabilitiesPublished,
      quarantined: primary.quarantine.list().length,
      driftReports,
      durationMs: Date.now() - start,
    };
  }
}

export function runLoadStress(): SimulationReport {
  const sim = new MeshSimulator({ organismCount: 5, messagesPerOrganism: 50 });
  sim.setup();
  return sim.run();
}

export function runGovernanceDriftStress(): SimulationReport {
  const sim = new MeshSimulator({ organismCount: 4, messagesPerOrganism: 20 });
  sim.setup();
  const report = sim.run();
  return report;
}
