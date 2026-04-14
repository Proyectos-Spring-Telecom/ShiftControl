import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatVistaVehiculo } from 'src/entities/CatVistaVehiculo';
import { CatVistaVehiculoService } from './cat-vista-vehiculo.service';
import { CatVistaVehiculoController } from './cat-vista-vehiculo.controller';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatVistaVehiculo]), BitacoraModule],
  controllers: [CatVistaVehiculoController],
  providers: [CatVistaVehiculoService],
  exports: [CatVistaVehiculoService],
})
export class CatVistaVehiculoModule {}
