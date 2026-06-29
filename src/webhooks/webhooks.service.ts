import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VehiculosService } from 'src/vehiculos/vehiculos.service';
import { ClientesService } from 'src/clientes/clientes.service';

/** Eventos que ShiftControl sabe procesar. */
enum WebhookEvent {
  VEHICULO_CREATED = 'vehiculo.created',
  VEHICULO_UPDATED = 'vehiculo.updated',
  VEHICULO_DELETED = 'vehiculo.deleted',
  CLIENTE_CREATED = 'cliente.created',
  CLIENTE_UPDATED = 'cliente.updated',
}

/** Payload que llega desde Next. */
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
   * 1. Valida la firma HMAC-SHA256
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
        await this.handleVehiculoChange(entityId, tenantId, data);
        break;

      case WebhookEvent.VEHICULO_DELETED:
        await this.handleVehiculoDeleted(entityId);
        break;

      case WebhookEvent.CLIENTE_CREATED:
      case WebhookEvent.CLIENTE_UPDATED:
        await this.handleClienteChange(entityId, data);
        break;

      default:
        this.logger.warn(`Evento desconocido: ${event}`);
        return { status: 'ignored', message: `Evento ${event} no procesado` };
    }

    return { status: 'ok', message: `Evento ${event} procesado` };
  }

  /** Valida que la firma del payload coincida con WEBHOOK_SECRET. */
  private validateSignature(payload: WebhookPayload): void {
    if (!this.webhookSecret) {
      this.logger.warn('WEBHOOK_SECRET no configurado — se omite validación de firma');
      return;
    }

    const { signature, ...payloadSinFirma } = payload;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payloadSinFirma))
      .digest('hex');

    const sigBuf = Buffer.from(String(signature ?? ''), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      this.logger.error('Firma de webhook inválida');
      throw new UnauthorizedException('Firma de webhook inválida');
    }
  }

  private async handleVehiculoChange(
    entityId: number,
    tenantId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const placasRaw = data?.placa ?? data?.placas;
    const placas = placasRaw != null ? String(placasRaw).trim() : '';
    if (!placas) {
      this.logger.warn(`Webhook vehiculo sin placa: entityId=${entityId}`);
      return;
    }

    const fotoFrente = this.pickOptionalString(
      data.fotoFrente ?? data.FotoFrente ?? data.foto,
    );
    const marca = this.pickOptionalString(
      data.marcaNombre ?? data.MarcaNombre ?? data.marca,
    );
    const modelo = this.pickOptionalString(
      data.modeloNombre ?? data.ModeloNombre ?? data.modelo,
    );

    await this.vehiculosService.ensureShadow(
      entityId,
      tenantId,
      placas,
      fotoFrente,
      marca,
      modelo,
    );
    this.logger.log(`Vehículo sombra sincronizado id=${entityId} placas=${placas}`);
  }

  private async handleVehiculoDeleted(entityId: number): Promise<void> {
    this.logger.log(
      `Vehículo ${entityId} eliminado en Next — registro sombra se mantiene para histórico`,
    );
  }

  private async handleClienteChange(
    entityId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    const idPadreRaw = data?.idPadre;
    const idPadre =
      idPadreRaw != null && idPadreRaw !== ''
        ? Number(idPadreRaw)
        : null;
    await this.clientesService.ensureShadow(
      entityId,
      idPadre != null && Number.isFinite(idPadre) ? idPadre : null,
    );
    this.logger.log(`Cliente sombra sincronizado id=${entityId} idPadre=${idPadre}`);
  }

  private pickOptionalString(raw: unknown): string | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw === null) {
      return null;
    }
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
  }
}
