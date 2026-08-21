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

/** Mensajes al usuario final: cercanos al texto de BehaviorIQ, sin tecnicismos. */
const PLATE_READ_USER_MESSAGES: Record<number, string> = {
  400: 'No se detectó la placa en la imagen. Vuelva a capturar la imagen e intente nuevamente.',
  401: 'No tiene autorización para utilizar este servicio.',
  403: 'El servicio de lectura de placas no está habilitado.',
  404: 'No se detectó la placa en la imagen. Vuelva a capturar la imagen e intente nuevamente.',
  422: 'La imagen no pudo procesarse. Se tomó como inválida; vuelva a capturar la imagen.',
  503: 'El servicio no está disponible en este momento. Intente más tarde.',
};

function extractBehaviorIqMessage(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    const t = data.trim();
    return t || undefined;
  }
  if (typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;
  const raw = obj.message ?? obj.mensaje ?? obj.error;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t || undefined;
  }
  if (Array.isArray(raw)) {
    const parts = raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    return parts.length ? parts.join('; ') : undefined;
  }
  return undefined;
}

/** True si el mensaje de BehaviorIQ puede mostrarse al usuario (sin detalle técnico). */
function isUserFacingMessage(message: string): boolean {
  const m = message.trim();
  if (m.length < 8) return false;
  if (
    /behavioriq|stack|exception|axios|econn|etimedout|respondió\s+\d|unprocessable|bad request|internal server|traceback|at\s+\w+\.|http\s+\d{3}|\b(png|jpeg|jpg|mime|multipart|form-data|bearer)\b/i.test(
      m,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Prefiere el mensaje original de BehaviorIQ si es apto para el usuario;
 * si no, usa el texto formal por status (sin tecnicismos).
 */
function resolvePlateReadUserMessage(status: number, data: unknown): string {
  const fromBiq = extractBehaviorIqMessage(data);
  if (fromBiq && isUserFacingMessage(fromBiq)) {
    return fromBiq;
  }

  const mapped = PLATE_READ_USER_MESSAGES[status];
  if (mapped) return mapped;

  if (status >= 500) {
    return 'Ocurrió un error al leer la placa. Intente más tarde.';
  }
  return 'No fue posible leer la placa. Vuelva a capturar la imagen e intente nuevamente.';
}

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
   * Propaga el mismo HTTP status que BehaviorIQ; el mensaje se formaliza para el usuario final.
   * Si no se pasa `bearerToken`, inicia sesión con credenciales del .env.
   */
  async readPlate(
    file: Express.Multer.File,
    bearerToken?: string,
  ): Promise<BehaviorIqPlateReadResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Debe adjuntar la imagen de la placa. Vuelva a capturarla e intente nuevamente.',
      );
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

      if (status !== 200 && status !== 201) {
        this.logger.warn(
          `behaviorIQ plate/read HTTP ${status}: ${JSON.stringify(data)}`,
        );
        // Mismo status que BehaviorIQ; mensaje formal para el usuario final.
        throw new HttpException(
          resolvePlateReadUserMessage(status, data),
          status,
        );
      }

      if (
        data == null ||
        typeof data.plate_number !== 'string' ||
        typeof data.confidence !== 'number'
      ) {
        throw new InternalServerErrorException(
          'No se pudo leer la placa. Intente nuevamente.',
        );
      }

      return data;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const ax = err as AxiosError;
      const msg =
        ax.response?.data != null
          ? JSON.stringify(ax.response.data)
          : ax.message;
      this.logger.error(`behaviorIQ plate/read error: ${msg}`);
      throw new InternalServerErrorException(
        'No fue posible leer la placa. Intente más tarde.',
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
