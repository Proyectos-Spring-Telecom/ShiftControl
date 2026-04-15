import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { BehaviorIqAuthService } from './behavioriq-auth.service';
import { getBehaviorIqBaseUrl } from './behavioriq-base-url';
import type { BehaviorIqPlateReadResponse } from './behavioriq-plate.interface';

@Injectable()
export class BehaviorIqPlateService {
  private readonly logger = new Logger(BehaviorIqPlateService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly behaviorIqAuth: BehaviorIqAuthService,
  ) {}

  /**
   * OCR de placa vía behaviorIQ `POST /plate/read`.
   * Si no se pasa `bearerToken`, inicia sesión con credenciales del .env.
   */
  async readPlate(
    file: Express.Multer.File,
    bearerToken?: string,
  ): Promise<BehaviorIqPlateReadResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no recibido');
    }

    const token =
      bearerToken?.replace(/^Bearer\s+/i, '').trim() ||
      (await this.behaviorIqAuth.loginWithEnvCredentials()).token;

    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/plate/read`;

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append('file', blob, file.originalname || 'placa.png');

    try {
      const { data, status } = await axios.post<BehaviorIqPlateReadResponse>(
        url,
        form,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 60_000,
          validateStatus: () => true,
        },
      );

      if (status === 403) {
        throw new BadRequestException(
          'behaviorIQ: servicio de placa no habilitado para esta solución',
        );
      }
      if (status === 503) {
        throw new ServiceUnavailableException(
          'behaviorIQ: servicio de placa no disponible',
        );
      }
      if (status !== 200 && status !== 201) {
        this.logger.warn(
          `behaviorIQ plate/read HTTP ${status}: ${JSON.stringify(data)}`,
        );
        throw new InternalServerErrorException(
          `behaviorIQ plate/read respondió ${status}`,
        );
      }

      if (
        data == null ||
        typeof data.plate_number !== 'string' ||
        typeof data.confidence !== 'number'
      ) {
        throw new InternalServerErrorException(
          'behaviorIQ plate/read: respuesta inválida',
        );
      }

      return data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null
          ? JSON.stringify(ax.response.data)
          : ax.message;
      this.logger.error(`behaviorIQ plate/read error: ${msg}`);
      throw new InternalServerErrorException(
        'No se pudo leer la placa en behaviorIQ',
      );
    }
  }
}
