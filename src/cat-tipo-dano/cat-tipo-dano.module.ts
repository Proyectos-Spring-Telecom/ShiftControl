import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatTipoDano } from 'src/entities/CatTipoDano';
import { CatTipoDanoService } from './cat-tipo-dano.service';
import { CatTipoDanoController } from './cat-tipo-dano.controller';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatTipoDano]), BitacoraModule],
  controllers: [CatTipoDanoController],
  providers: [CatTipoDanoService],
  exports: [CatTipoDanoService],
})
export class CatTipoDanoModule {}
