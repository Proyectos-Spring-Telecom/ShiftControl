import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VehiculosService } from 'src/vehiculos/vehiculos.service';
import { ClientesService } from 'src/clientes/clientes.service';

/** Eventos que ShiftControl sabe procesar (alineados con Next WebhookEmitter). */
enum WebhookEvent {
  VEHICULO_CREATED = 'vehiculo.created',
  VEHICULO_UPDATED = 'vehiculo.updated',
  VEHICULO_DELETED = 'vehiculo.deleted',
  CLIENTE_CREATED = 'cliente.created',
  CLIENTE_UPDATED = 'cliente.updated',
}

/** Payload que llega desde Next (envelope §2). */
export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId: number;
  entityId: number;
  data: Record<string, unknown>;
  signature: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly vehiculosService: VehiculosService,
    private readonly clientesService: ClientesService,
  ) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET') ?? '';
  }

  /**
   * Procesa un webhook recibido desde Next.
   * 1. Valida la firma HMAC-SHA256 (orden fijo de claves)
   * 2. Identifica el evento
   * 3. Actualiza la tabla sombra correspondiente
   */
  async processWebhook(
    payload: WebhookPayload,
  ): Promise<{ status: string; message: string }> {
    this.validateSignature(payload);

    const { event, entityId, tenantId, data } = payload;
    this.logger.log(
      `Webhook recibido: ${event} entityId=${entityId} tenantId=${tenantId}`,
    );

    switch (event) {
      case WebhookEvent.VEHICULO_CREATED:
      case WebhookEvent.VEHICULO_UPDATED:
        await this.handleVehiculoChange(entityId, tenantId, data ?? {});
        break;

      case WebhookEvent.VEHICULO_DELETED:
        await this.handleVehiculoDeleted(entityId, tenantId, data ?? {});
        break;

      case WebhookEvent.CLIENTE_CREATED:
      case WebhookEvent.CLIENTE_UPDATED:
        await this.handleClienteChange(entityId, data ?? {});
        break;

      default:
        this.logger.warn(`Evento desconocido: ${event}`);
        return { status: 'ignored', message: `Evento ${event} no procesado` };
    }

    return { status: 'ok', message: `Evento ${event} procesado` };
  }

  /**
   * Valida HMAC-SHA256 reconstruyendo el unsigned con el orden del contrato:
   * event → timestamp → tenantId → entityId → data
   * (data de vehículo: placa, marcaNombre, modeloNombre, fotoFrente)
   */
  private validateSignature(payload: WebhookPayload): void {
    if (!this.webhookSecret) {
      this.logger.error('WEBHOOK_SECRET no configurado');
      throw new UnauthorizedException('WEBHOOK_SECRET no configurado');
    }

    const unsigned = this.buildUnsignedPayload(payload);
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(unsigned))
      .digest('hex');

    const sigBuf = Buffer.from(String(payload.signature ?? ''), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      this.logger.error('Firma de webhook inválida');
      throw new UnauthorizedException('Firma de webhook inválida');
    }
  }

  /** Objeto firmado por Next: claves en orden fijo. */
  private buildUnsignedPayload(payload: WebhookPayload): Record<string, unknown> {
    return {
      event: payload.event,
      timestamp: payload.timestamp,
      tenantId: Number(payload.tenantId),
      entityId: Number(payload.entityId),
      data: this.buildDataForSigning(payload.event, payload.data),
    };
  }

  /**
   * Rearma `data` con el orden de claves del emisor Next.
   * Vehículo: placa → marcaNombre → modeloNombre → fotoFrente
   * Cliente: idPadre
   */
  private buildDataForSigning(
    event: string,
    data: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    const src = data && typeof data === 'object' && !Array.isArray(data) ? data : {};

    if (event.startsWith('vehiculo.')) {
      return {
        placa: src['placa'] ?? '',
        marcaNombre: src['marcaNombre'] ?? '',
        modeloNombre: src['modeloNombre'] ?? '',
        fotoFrente: src['fotoFrente'] ?? null,
      };
    }

    if (event.startsWith('cliente.')) {
      return {
        idPadre: src['idPadre'] ?? null,
      };
    }

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src)) {
      out[key] = src[key];
    }
    return out;
  }

  private async handleVehiculoChange(
    entityId: number,
    tenantId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const placas = this.pickPlaca(data);
    if (!placas) {
      this.logger.warn(`Webhook vehiculo sin placa: entityId=${entityId}`);
      return;
    }

    const marca = this.pickCatalogName(data['marcaNombre']);
    const modelo = this.pickCatalogName(data['modeloNombre']);
    const fotoFrente = this.pickFotoFrente(data['fotoFrente']);

    await this.vehiculosService.ensureShadow(
      entityId,
      tenantId,
      placas,
      fotoFrente,
      marca,
      modelo,
    );
    this.logger.log(
      `Vehículo sombra sincronizado id=${entityId} placas=${placas}`,
    );
  }

  /**
   * Baja lógica en Next (estatus 0/3/4/5): elimina la sombra local
   * para que no se abran turnos nuevos. Los turnos históricos conservan IdVehiculo.
   */
  private async handleVehiculoDeleted(
    entityId: number,
    _tenantId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const placas = this.pickPlaca(data);
    await this.vehiculosService.removeShadow(entityId);
    this.logger.log(
      `Vehículo sombra dado de baja (deleted) id=${entityId} placas=${placas || 'N/A'}`,
    );
  }

  private async handleClienteChange(
    entityId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const idPadreRaw = data?.['idPadre'];
    const idPadre =
      idPadreRaw != null && idPadreRaw !== ''
        ? Number(idPadreRaw)
        : null;
    await this.clientesService.ensureShadow(
      entityId,
      idPadre != null && Number.isFinite(idPadre) ? idPadre : null,
    );
    this.logger.log(
      `Cliente sombra sincronizado id=${entityId} idPadre=${idPadre}`,
    );
  }

  private pickPlaca(data: Record<string, unknown>): string {
    const raw = data['placa'];
    return raw != null ? String(raw).trim() : '';
  }

  /** Catálogo: string; `""` → null en sombra. */
  private pickCatalogName(raw: unknown): string | null {
    if (raw == null) {
      return null;
    }
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
  }

  /** fotoFrente: URL string o null (contrato). */
  private pickFotoFrente(raw: unknown): string | null {
    if (raw == null) {
      return null;
    }
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
  }
}
