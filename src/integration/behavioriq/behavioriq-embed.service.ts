import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { BehaviorIqAuthService } from './behavioriq-auth.service';
import { getBehaviorIqBaseUrl } from './behavioriq-base-url';
import type {
  BehaviorIqCrearRostroResponse,
  BehaviorIqEmbedResponse,
  BehaviorIqValidatePoseResponse,
} from './behavioriq-embed.interface';

/**
 * Cliente HTTP hacia **BehaviorIQ** para afiliación de rostro:
 * `POST /embed/validate-pose`, `POST /embed` y `POST /rostros`.
 *
 * Token BehaviorIQ: siempre vía `BehaviorIqAuthService.loginWithEnvCredentials()`
 * (`BEHAVIORIQ_USER_NAME` / `BEHAVIORIQ_PASSWORD`), igual que en turnos (OCR placa).
 * El cliente solo envía el **JWT de ShiftControl** a este API.
 *
 * @see docs/EMBED_BFF_SHIFTCONTROL.md
 */
@Injectable()
export class BehaviorIqEmbedService {
  private readonly logger = new Logger(BehaviorIqEmbedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly behaviorIqAuth: BehaviorIqAuthService,
  ) {}

  /**
   * Obtiene token de acceso BehaviorIQ con credenciales de servicio del entorno
   * (`POST {BEHAVIORIQ_BASE_URL}/auth/login`), alineado con `turnos.service` / OCR placa.
   */
  async obtainBehaviorIqTokenFromEnv(): Promise<string> {
    const { token } = await this.behaviorIqAuth.loginWithEnvCredentials();
    return token;
  }

  async validatePose(
    file: Express.Multer.File,
    sampleIndex: '1' | '2' | '3',
    bearerToken: string,
  ): Promise<BehaviorIqValidatePoseResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no recibido');
    }

    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/embed/validate-pose?sample_index=${encodeURIComponent(sampleIndex)}`;

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append('file', blob, file.originalname || 'rostro.png');

    try {
      const { data, status } = await axios.post<BehaviorIqValidatePoseResponse>(url, form, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 60_000,
        validateStatus: () => true,
      });

      if (status === 403) {
        throw new HttpException(
          data ?? { message: 'behaviorIQ: servicio de rostro no habilitado para esta solución' },
          403,
        );
      }
      if (status === 503) {
        throw new ServiceUnavailableException('behaviorIQ: servicio no disponible');
      }
      if (status !== 200 && status !== 201) {
        this.logger.warn(`behaviorIQ validate-pose HTTP ${status}: ${JSON.stringify(data)}`);
        throw new HttpException(data ?? { message: 'validate-pose falló' }, status);
      }

      if (data == null || typeof data.valid !== 'boolean') {
        throw new InternalServerErrorException('behaviorIQ validate-pose: respuesta inválida');
      }

      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof HttpException ||
        err instanceof ServiceUnavailableException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null ? JSON.stringify(ax.response.data) : ax.message;
      this.logger.error(`behaviorIQ validate-pose error: ${msg}`);
      throw new InternalServerErrorException('No se pudo validar la pose en behaviorIQ');
    }
  }

  async embed(
    file: Express.Multer.File,
    bearerToken: string,
  ): Promise<BehaviorIqEmbedResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no recibido');
    }

    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/embed`;

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append('file', blob, file.originalname || 'rostro.png');

    try {
      const { data, status } = await axios.post<BehaviorIqEmbedResponse>(url, form, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 120_000,
        validateStatus: () => true,
      });

      if (status === 400) {
        throw new HttpException(data ?? { message: 'No es imagen válida' }, 400);
      }
      if (status === 403) {
        throw new HttpException(
          data ?? { message: 'behaviorIQ: servicio de rostro no habilitado para esta solución' },
          403,
        );
      }
      if (status === 404) {
        throw new HttpException(data ?? { message: 'No se detectó rostro en la imagen' }, 404);
      }
      if (status === 503) {
        throw new ServiceUnavailableException('behaviorIQ: servicio no disponible');
      }
      if (status !== 200 && status !== 201) {
        this.logger.warn(`behaviorIQ embed HTTP ${status}: ${JSON.stringify(data)}`);
        throw new HttpException(data ?? { message: 'embed falló' }, status);
      }

      if (
        data == null ||
        !Array.isArray(data.embedding) ||
        data.embedding.length === 0
      ) {
        throw new InternalServerErrorException('behaviorIQ embed: respuesta inválida');
      }

      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof HttpException ||
        err instanceof ServiceUnavailableException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null ? JSON.stringify(ax.response.data) : ax.message;
      this.logger.error(`behaviorIQ embed error: ${msg}`);
      throw new InternalServerErrorException('No se pudo obtener el embedding en behaviorIQ');
    }
  }

  async crearRostro(
    body: Record<string, unknown>,
    bearerToken: string,
  ): Promise<BehaviorIqCrearRostroResponse> {
    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/rostros`;

    try {
      const { data, status } = await axios.post<BehaviorIqCrearRostroResponse>(url, body, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 60_000,
        validateStatus: () => true,
      });

      if (status === 401) {
        throw new HttpException(data ?? { message: 'No autorizado' }, 401);
      }
      if (status === 403) {
        throw new HttpException(
          data ?? { message: 'Solo puede registrar en su cliente/solución (o root)' },
          403,
        );
      }
      if (status === 409) {
        throw new HttpException(
          data ?? { message: 'Rostro duplicado en esta solución' },
          409,
        );
      }
      if (status !== 200 && status !== 201) {
        this.logger.warn(`behaviorIQ POST /rostros HTTP ${status}: ${JSON.stringify(data)}`);
        throw new HttpException(data ?? { message: 'crear rostro falló' }, status);
      }

      return data ?? { success: true };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null ? JSON.stringify(ax.response.data) : ax.message;
      this.logger.error(`behaviorIQ POST /rostros error: ${msg}`);
      throw new InternalServerErrorException('No se pudo registrar el rostro en behaviorIQ');
    }
  }
}
