import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatEstatusTurno } from 'src/entities/CatEstatusTurno';
import { CatEstatusTurnoService } from './cat-estatus-turno.service';
import { CatEstatusTurnoController } from './cat-estatus-turno.controller';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatEstatusTurno]), BitacoraModule],
  controllers: [CatEstatusTurnoController],
  providers: [CatEstatusTurnoService],
  exports: [CatEstatusTurnoService],
})
export class CatEstatusTurnoModule {}
