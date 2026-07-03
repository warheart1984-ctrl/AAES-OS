import { PlatformClient } from '@aaes-os/platform-sdk';

async function main() {
  const client = new PlatformClient({ baseUrl: 'http://localhost:4100' });
  await client.login('example-dev', 'balanced');

  await client.publishCapability({
    id: 'cap.hello',
    name: 'Hello Capability',
    organId: 'organ-demo',
    version: '1.0.0',
    description: 'Echo input under governance',
  });

  const result = await client.invokeCapability('cap.hello', { message: 'world' });
  console.log('governance allowed:', result.governance.allowed);
  console.log('billing units:', result.billing.units);

  const usage = await client.getUsage();
  console.log('total usage:', usage.totalUnits);
}

main().catch(console.error);
