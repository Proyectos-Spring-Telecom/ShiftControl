import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Turnos } from "src/entities/Turnos";
import { Vehiculos } from "src/entities/Vehiculos";
import { CatEstatusTurno } from "src/entities/CatEstatusTurno";
import { TurnosController } from "./turnos.controller";
import { TurnosService } from "./turnos.service";
import { BitacoraModule } from "src/bitacora/bitacora.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Turnos, Vehiculos, CatEstatusTurno]),
    BitacoraModule,
  ],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
