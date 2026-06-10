import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type {
  NominatimReverseResponse,
  ReverseGeocodingResult,
} from './interfaces/nominatim-reverse.response';

const NOMINATIM_DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org';

@Injectable()
export class UbicacionService {
  private readonly logger = new Logger(UbicacionService.name);

  constructor(private readonly configService: ConfigService) {}

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult> {
    const baseUrl =
      this.configService.get<string>('NOMINATIM_BASE_URL')?.replace(/\/$/, '') ||
      NOMINATIM_DEFAULT_BASE_URL;
    const url = `${baseUrl}/reverse`;

    const host = this.configService.get<string>('HOST', 'shiftcontrol');
    const userAgent = `ShiftControl/1.0 (${host})`;

    try {
      const { data, status } = await axios.get<NominatimReverseResponse>(url, {
        params: {
          lat,
          lon,
          format: 'jsonv2',
        },
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es',
          'User-Agent': userAgent,
        },
        timeout: 15_000,
        validateStatus: () => true,
      });

      if (status >= 500) {
        throw new ServiceUnavailableException(
          'El servicio de geocodificación no está disponible en este momento',
        );
      }

      if (status >= 400 || data?.error) {
        throw new NotFoundException({
          message: 'No se encontró una dirección para las coordenadas indicadas',
          details: data?.error,
        });
      }

      if (!data?.display_name) {
        throw new NotFoundException(
          'No se encontró una dirección para las coordenadas indicadas',
        );
      }

      return {
        displayName: data.display_name ?? null,
        address: data.address ?? null,
        lat,
        lon,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const axiosErr = error as AxiosError;
      this.logger.error(
        `Error Nominatim reverse geocoding lat=${lat} lon=${lon}: ${axiosErr.message}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo consultar la dirección en este momento',
      );
    }
  }
}
