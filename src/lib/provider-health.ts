// Configuration is not proof of a successful provider connection or live operation.
// Keep this projection free of credentials, tokens, phone numbers and webhook URLs.
export type ProviderHealth = {
  stripe: 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED';
  sms: 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED';
  rotorInbox: 'NOT_AUTHORIZED' | 'AUTHORIZED_UNVERIFIED';
  routing: 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED';
};

export function providerHealthSummary(
  providers: {stripe: {configured: boolean}; twilio: {configured: boolean}},
  rotor: {connected: boolean; grantedScopes: readonly string[]},
  routingConfigured=false,
): ProviderHealth {
  return {
    stripe: providers.stripe.configured ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED',
    sms: providers.twilio.configured ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED',
    rotorInbox: rotor.connected && rotor.grantedScopes.includes('inbox:read')
      ? 'AUTHORIZED_UNVERIFIED' : 'NOT_AUTHORIZED',
    routing: routingConfigured?'CONFIGURED_UNVERIFIED':'NOT_CONFIGURED',
  };
}
