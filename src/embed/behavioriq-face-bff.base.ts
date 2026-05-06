import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { BehaviorIqEmbedService } from 'src/integration/behavioriq/behavioriq-embed.service';

/**
 * Base para los BFF de afiliación de rostro (embed + rostros):
 * el cliente envía **solo** `Authorization: Bearer <JWT ShiftControl>`;
 * hacia BehaviorIQ este backend usa siempre login con `BEHAVIORIQ_*` del entorno.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@ApiBearerAuth('bearer-token')
export abstract class BehaviorIqFaceBffBaseController {
  constructor(protected readonly behaviorIqEmbed: BehaviorIqEmbedService) {}

  /** Token BehaviorIQ vía cuenta de servicio (.env), no expuesto al front. */
  protected behaviorIqServiceToken(): Promise<string> {
    return this.behaviorIqEmbed.obtainBehaviorIqTokenFromEnv();
  }
}
