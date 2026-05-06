/**
 * Expone en ShiftControl (`/api/embed`, `/api/rostros`) el proxy hacia BehaviorIQ
 * para **afiliar rostro** (validate pose → embedding → registro).
 *
 * Controladores: `EmbedBehaviorIqController` y `RostrosBehaviorIqController` en
 * `behavioriq-face-affiliation.controllers.ts`; cliente HTTP: `BehaviorIqEmbedService`.
 *
 * @see docs/EMBED_BFF_SHIFTCONTROL.md
 * @see docs/PROCESO_BEHAVIORIQ.MD
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuarios } from 'src/entities/Usuarios';
import { EndpointProxyModule } from 'src/integration/endpoint-proxy.module';
import { BehaviorIqEmbedService } from 'src/integration/behavioriq/behavioriq-embed.service';
import {
  EmbedBehaviorIqController,
  RostrosBehaviorIqController,
} from './behavioriq-face-affiliation.controllers';

@Module({
  imports: [EndpointProxyModule, TypeOrmModule.forFeature([Usuarios])],
  controllers: [EmbedBehaviorIqController, RostrosBehaviorIqController],
  providers: [BehaviorIqEmbedService],
})
export class EmbedModule {}
