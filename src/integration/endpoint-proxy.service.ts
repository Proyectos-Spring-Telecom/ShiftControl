import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import type { Request } from 'express';

@Injectable()
export class EndpointProxyService {
  private readonly logger = new Logger(EndpointProxyService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const base = this.normalizeApiBaseUrl(
      this.configService.getOrThrow<string>('ENDPOINT_URL'),
    );
    this.client = axios.create({
      baseURL: base,
      timeout: 60_000,
      validateStatus: () => true,
    });
  }

  private normalizeApiBaseUrl(raw: string): string {
    let u = raw.trim().replace(/\/+$/, '');
    if (!u.endsWith('/api')) {
      u = `${u}/api`;
    }
    return `${u}/`;
  }

  private pickAuthHeader(req: Request): string | undefined {
    const h = req.headers.authorization;
    return typeof h === 'string' && h.length > 0 ? h : undefined;
  }

  /** Serializa query de Express a params de axios (solo valores string simples). */
  private queryToParams(query: Request['query']): Record<string, string> | undefined {
    if (!query || typeof query !== 'object') {
      return undefined;
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (typeof value === 'string' && value !== '') {
        out[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'string') {
          out[key] = first;
        }
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  async forwardPost(path: string, body: unknown, req: Request) {
    return this.forward('post', path, body, req);
  }

  async forwardPatch(path: string, body: unknown, req: Request) {
    return this.forward('patch', path, body, req);
  }

  async forwardGet(path: string, req: Request) {
    return this.forward('get', path, undefined, req);
  }

  /**
   * POST hacia Next (`ENDPOINT_URL` → sufijo `/api/`), misma base que `forwardPost('login', ...)`.
   * Para llamadas sin `Request` de Express pero con el header Authorization del cliente.
   */
  async forwardPostWithAuthorization(
    path: string,
    body: unknown,
    authorization: string,
  ): Promise<{ status: number; data: unknown }> {
    const url = path.replace(/^\/+/, '');
    const headers: Record<string, string> = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      Authorization: authorization.trim(),
    };
    try {
      const res = await this.client.request({
        method: 'post',
        url,
        data: body,
        headers,
      });
      return { status: res.status, data: res.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logAxiosError('post', url, err);
      } else {
        this.logger.warn(`Error al llamar upstream post ${url}: ${err}`);
      }
      throw new InternalServerErrorException(
        'No se pudo contactar el servicio remoto (upstream).',
      );
    }
  }

  private async forward(
    method: 'get' | 'post' | 'patch',
    path: string,
    body: unknown,
    req: Request,
  ): Promise<{ status: number; data: unknown }> {
    const url = path.replace(/^\/+/, '');
    const authorization = this.pickAuthHeader(req);
    const params = this.queryToParams(req.query);
    const headers: Record<string, string> = {};
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (body !== undefined && method !== 'get') {
      headers['Content-Type'] = 'application/json';
    }
    try {
      const res = await this.client.request({
        method,
        url,
        data: body,
        headers,
        params,
      });
      return { status: res.status, data: res.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logAxiosError(method, url, err);
      } else {
        this.logger.warn(`Error al llamar upstream ${method} ${url}: ${err}`);
      }
      throw new InternalServerErrorException(
        'No se pudo contactar el servicio remoto (upstream).',
      );
    }
  }

  private logAxiosError(
    method: string,
    url: string,
    err: AxiosError,
  ): void {
    const code = err.code ?? 'unknown';
    const status = err.response?.status;
    this.logger.warn(
      `Upstream ${method} ${url} falló: code=${code} status=${status ?? 'n/a'} message=${err.message}`,
    );
  }
}
