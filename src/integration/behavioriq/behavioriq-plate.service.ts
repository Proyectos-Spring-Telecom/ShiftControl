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
  BehaviorIqCreatePlacaBody,
  BehaviorIqCreatePlacaResult,
  BehaviorIqCreatePlacaResponse,
  BehaviorIqPlateReadResponse,
  BehaviorIqValidarPlacaQuery,
  BehaviorIqValidarPlacaResponse,
} from './behavioriq-plate.interface';

@Injectable()
export class BehaviorIqPlateService {
  /** Token BehaviorIQ vía cuenta de servicio (.env), no expuesto al front. */
  async obtainBehaviorIqTokenFromEnv(): Promise<string> {
    const { token } = await this.behaviorIqAuth.loginWithEnvCredentials();
    return token;
  }

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
      if (status === 404) {
        throw new BadRequestException(
          'No fue posible asociar el vehículo al turno. La placa no está registrada en el sistema o no pudo identificarse correctamente en la imagen. Verifique que la unidad esté dada de alta e intente nuevamente con una fotografía clara de la placa.',
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

  async createPlaca(
    body: BehaviorIqCreatePlacaBody,
    bearerToken: string,
  ): Promise<BehaviorIqCreatePlacaResult> {
    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const url = `${baseUrl}/placas`;

    try {
      const { data, status } = await axios.post<BehaviorIqCreatePlacaResponse>(url, body, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 60_000,
        validateStatus: () => true,
      });

      if (status === 403) {
        throw new HttpException(
          data ?? { message: 'Solo puede registrar en su cliente/solución (o root)' },
          403,
        );
      }
      if (status === 409) {
        throw new HttpException(
          data ?? { message: 'Placa ya registrada en este cliente/solución' },
          409,
        );
      }
      if (status !== 200 && status !== 201) {
        this.logger.warn(`behaviorIQ POST /placas HTTP ${status}: ${JSON.stringify(data)}`);
        throw new InternalServerErrorException(`behaviorIQ /placas respondió ${status}`);
      }

      return {
        status,
        data: (data ?? {}) as BehaviorIqCreatePlacaResponse,
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof HttpException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null ? JSON.stringify(ax.response.data) : ax.message;
      this.logger.error(`behaviorIQ POST /placas error: ${msg}`);
      throw new InternalServerErrorException('No se pudo registrar la placa en behaviorIQ');
    }
  }

  async validarPlaca(
    query: BehaviorIqValidarPlacaQuery,
    bearerToken: string,
  ): Promise<BehaviorIqValidarPlacaResponse> {
    const numeroPlaca = query.numeroPlaca?.trim();
    if (!numeroPlaca) {
      throw new BadRequestException('numeroPlaca es obligatorio');
    }

    const baseUrl = getBehaviorIqBaseUrl(this.configService);
    const params = new URLSearchParams();
    params.set('numeroPlaca', numeroPlaca);
    if (query.idCliente != null && query.idCliente !== '') {
      params.set('idCliente', String(query.idCliente));
    }
    if (query.idSolucion != null && query.idSolucion !== '') {
      params.set('idSolucion', String(query.idSolucion));
    }
    if (query.latitud != null && query.latitud !== '') {
      params.set('latitud', String(query.latitud));
    }
    if (query.longitud != null && query.longitud !== '') {
      params.set('longitud', String(query.longitud));
    }

    const url = `${baseUrl}/placas/validar?${params.toString()}`;

    try {
      const { data, status } = await axios.get<BehaviorIqValidarPlacaResponse>(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 60_000,
        validateStatus: () => true,
      });

      if (status === 403) {
        throw new HttpException(
          data ?? { message: 'behaviorIQ: sin permiso o servicio de placa no habilitado' },
          403,
        );
      }
      if (status === 503) {
        throw new ServiceUnavailableException('behaviorIQ: servicio de placa no disponible');
      }
      if (status !== 200) {
        this.logger.warn(`behaviorIQ GET /placas/validar HTTP ${status}: ${JSON.stringify(data)}`);
        throw new HttpException(data ?? { message: 'validar placa falló' }, status);
      }

      if (data == null || typeof data.registered !== 'boolean') {
        throw new InternalServerErrorException('behaviorIQ /placas/validar: respuesta inválida');
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
      this.logger.error(`behaviorIQ GET /placas/validar error: ${msg}`);
      throw new InternalServerErrorException('No se pudo validar la placa en behaviorIQ');
    }
  }
}
