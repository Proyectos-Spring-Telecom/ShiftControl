import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhooksService, type WebhookPayload } from './webhooks.service';

/**
 * Receptor de webhooks de Next.
 * NO tiene JwtAuthGuard — la autenticación es por firma HMAC-SHA256.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('next')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Receptor de webhooks de Next',
    description:
      'Recibe notificaciones cuando cambia un vehículo o cliente en Next. ' +
      'Envelope: event, timestamp, tenantId, entityId, data, signature. ' +
      'Auth: HMAC-SHA256 del unsigned (orden fijo de claves) con WEBHOOK_SECRET; sin JWT. ' +
      'Vehículo data: placa, marcaNombre, modeloNombre, fotoFrente. Cliente data: idPadre.',
  })
  @ApiResponse({ status: 200, description: 'Webhook procesado' })
  @ApiResponse({ status: 401, description: 'Firma inválida' })
  async receiveWebhook(@Body() payload: WebhookPayload) {
    this.logger.log(`Webhook recibido: ${payload?.event}`);
    return this.webhooksService.processWebhook(payload);
  }
}
