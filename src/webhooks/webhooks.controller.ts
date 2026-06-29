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
      'Recibe notificaciones cuando una entidad cambia en Next (vehículo, cliente, etc.). ' +
      'Autenticado por firma HMAC-SHA256 (`WEBHOOK_SECRET`), no por JWT.',
  })
  @ApiResponse({ status: 200, description: 'Webhook procesado' })
  @ApiResponse({ status: 401, description: 'Firma inválida' })
  async receiveWebhook(@Body() payload: WebhookPayload) {
    this.logger.log(`Webhook recibido: ${payload?.event}`);
    return this.webhooksService.processWebhook(payload);
  }
}
