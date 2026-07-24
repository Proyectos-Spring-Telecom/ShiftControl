import { Module } from '@nestjs/common';
import { TurnosStorageService } from './turnos-storage.service';

@Module({
  providers: [TurnosStorageService],
  exports: [TurnosStorageService],
})
export class TurnosStorageModule {}
