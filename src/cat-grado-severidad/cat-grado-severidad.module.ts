import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatGradoSeveridad } from 'src/entities/CatGradoSeveridad';
import { CatGradoSeveridadService } from './cat-grado-severidad.service';
import { CatGradoSeveridadController } from './cat-grado-severidad.controller';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatGradoSeveridad]), BitacoraModule],
  controllers: [CatGradoSeveridadController],
  providers: [CatGradoSeveridadService],
  exports: [CatGradoSeveridadService],
})
export class CatGradoSeveridadModule {}
