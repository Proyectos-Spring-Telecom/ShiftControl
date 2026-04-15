import { ConfigService } from '@nestjs/config';

export const BEHAVIORIQ_ENV_BASE_URL = 'BEHAVIORIQ_BASE_URL';

export const BEHAVIORIQ_DEFAULT_BASE_URL = 'http://localhost:3000';

/**
 * Base URL de behaviorIQ (sin barra final), misma que usa login y plate/read.
 */
export function getBehaviorIqBaseUrl(configService: ConfigService): string {
  const raw =
    configService.get<string>(BEHAVIORIQ_ENV_BASE_URL) ?? BEHAVIORIQ_DEFAULT_BASE_URL;
  return raw.trim().replace(/\/+$/, '');
}
