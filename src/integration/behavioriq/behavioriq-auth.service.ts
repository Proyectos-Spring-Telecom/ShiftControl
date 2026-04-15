import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type {
  BehaviorIqLoginRequestBody,
  BehaviorIqLoginResponse,
} from './behavioriq-auth.interface';
import { getBehaviorIqBaseUrl } from './behavioriq-base-url';

/** Claves en .env / ConfigService (equivalente a userName y password). */
const ENV_USER_NAME = 'BEHAVIORIQ_USER_NAME';
const ENV_PASSWORD = 'BEHAVIORIQ_PASSWORD';

@Injectable()
export class BehaviorIqAuthService {
  private readonly logger = new Logger(BehaviorIqAuthService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Obtiene token y refreshToken usando `BEHAVIORIQ_USER_NAME` y `BEHAVIORIQ_PASSWORD` del entorno.
   * POST `{base}/auth/login` con cuerpo `{ usuario, contrasena }` según la API behaviorIQ.
   */
  async loginWithEnvCredentials(): Promise<BehaviorIqLoginResponse> {
    const usuario = this.configService.get<string>(ENV_USER_NAME)?.trim();
    const contrasena = this.configService.get<string>(ENV_PASSWORD);

    if (!usuario || contrasena === undefined || contrasena === '') {
      throw new InternalServerErrorException(
        `Configure ${ENV_USER_NAME} y ${ENV_PASSWORD} en el entorno`,
      );
    }

    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/auth/login`;
    const body: BehaviorIqLoginRequestBody = { usuario, contrasena };

    try {
      const { data, status } = await axios.post<BehaviorIqLoginResponse>(
        url,
        body,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
          validateStatus: () => true,
        },
      );

      if (status !== 200 && status !== 201) {
        this.logger.warn(
          `behaviorIQ login HTTP ${status}: ${JSON.stringify(data)}`,
        );
        throw new InternalServerErrorException(
          `behaviorIQ login respondió ${status}`,
        );
      }

      if (
        !data?.success ||
        typeof data.token !== 'string' ||
        typeof data.refreshToken !== 'string'
      ) {
        throw new InternalServerErrorException(
          'behaviorIQ login: respuesta inválida (falta success, token o refreshToken)',
        );
      }

      return data;
    } catch (err) {
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null
          ? JSON.stringify(ax.response.data)
          : ax.message;
      this.logger.error(`behaviorIQ login error: ${msg}`);
      throw new InternalServerErrorException(
        'No se pudo autenticar contra behaviorIQ',
      );
    }
  }
}
