import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { BehaviorIqPlateService } from 'src/integration/behavioriq/behavioriq-plate.service';

/**
 * Base BFF para placas:
 * el cliente envía solo JWT ShiftControl y este backend obtiene token BehaviorIQ con BEHAVIORIQ_*.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@ApiBearerAuth('bearer-token')
export abstract class PlacasBffBaseController {
  constructor(protected readonly behaviorIqPlate: BehaviorIqPlateService) {}

  protected behaviorIqServiceToken(): Promise<string> {
    return this.behaviorIqPlate.obtainBehaviorIqTokenFromEnv();
  }
}
