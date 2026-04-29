import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turnos } from 'src/entities/Turnos';
import { Vehiculos } from 'src/entities/Vehiculos';
import { BitacoraVehiculo } from 'src/entities/BitacoraVehiculo';
import { IncidenciaAccidente } from 'src/entities/IncidenciaAccidente';
import { IncidenciaGasolina } from 'src/entities/IncidenciaGasolina';
import { InspeccionVehiculoEx } from 'src/entities/InspeccionVehiculoEx';
import { TenantFilterModule } from 'src/common/tenant-filter/tenant-filter.module';
import { MailModule } from 'src/mail/mail.module';
import { ReportesController } from './reportes.controller';
import { ReportesPdfService } from './reportes-pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turnos,
      Vehiculos,
      BitacoraVehiculo,
      IncidenciaAccidente,
      IncidenciaGasolina,
      InspeccionVehiculoEx,
    ]),
    TenantFilterModule,
    MailModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesPdfService, PuppeteerPdfService],
  exports: [ReportesPdfService],
})
export class ReportesModule {}
