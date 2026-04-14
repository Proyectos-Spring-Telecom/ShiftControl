import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatPartesVehiculoEx } from 'src/entities/CatPartesVehiculoEx';
import { CatPartesVehiculoExService } from './cat-partes-vehiculo-ex.service';
import { CatPartesVehiculoExController } from './cat-partes-vehiculo-ex.controller';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatPartesVehiculoEx]), BitacoraModule],
  controllers: [CatPartesVehiculoExController],
  providers: [CatPartesVehiculoExService],
  exports: [CatPartesVehiculoExService],
})
export class CatPartesVehiculoExModule {}
