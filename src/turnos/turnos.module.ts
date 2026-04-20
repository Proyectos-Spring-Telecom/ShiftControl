import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turnos } from 'src/entities/Turnos';
import { Vehiculos } from 'src/entities/Vehiculos';
import { CatEstatusTurno } from 'src/entities/CatEstatusTurno';
import { BitacoraVehiculo } from 'src/entities/BitacoraVehiculo';
import { Tablero } from 'src/entities/Tablero';
import { TestigosVehiculo } from 'src/entities/TestigosVehiculo';
import { NivelesFluidos } from 'src/entities/NivelesFluidos';
import { LucesVehiculo } from 'src/entities/LucesVehiculo';
import { DocumentacionVehiculo } from 'src/entities/DocumentacionVehiculo';
import { AccesoriosVehiculo } from 'src/entities/AccesoriosVehiculo';
import { InspeccionVehiculoEx } from 'src/entities/InspeccionVehiculoEx';
import { IncidenciaAccidente } from 'src/entities/IncidenciaAccidente';
import { CatTipoDano } from 'src/entities/CatTipoDano';
import { CatGradoSeveridad } from 'src/entities/CatGradoSeveridad';
import { IncidenciaGasolina } from 'src/entities/IncidenciaGasolina';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { S3Module } from 'src/s3/s3.module';
import { EndpointProxyModule } from 'src/integration/endpoint-proxy.module';
import { VehiculosModule } from 'src/vehiculos/vehiculos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turnos,
      Vehiculos,
      CatEstatusTurno,
      BitacoraVehiculo,
      Tablero,
      TestigosVehiculo,
      NivelesFluidos,
      LucesVehiculo,
      DocumentacionVehiculo,
      AccesoriosVehiculo,
      InspeccionVehiculoEx,
      IncidenciaAccidente,
      CatTipoDano,
      CatGradoSeveridad,
      IncidenciaGasolina,
    ]),
    S3Module,
    EndpointProxyModule,
    VehiculosModule,
  ],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
