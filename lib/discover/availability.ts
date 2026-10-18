/** Build It AI is excluded from the launch. Enabling it requires an explicit deployment flag. */
export function isDiscoveryEnabled(): boolean {
  return process.env.DISCOVERY_ENABLED === 'true';
}
