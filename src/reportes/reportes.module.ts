import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turnos } from 'src/entities/Turnos';
import { BitacoraVehiculo } from 'src/entities/BitacoraVehiculo';
import { IncidenciaAccidente } from 'src/entities/IncidenciaAccidente';
import { IncidenciaGasolina } from 'src/entities/IncidenciaGasolina';
import { InspeccionVehiculoEx } from 'src/entities/InspeccionVehiculoEx';
import { TenantFilterModule } from 'src/common/tenant-filter/tenant-filter.module';
import { MailModule } from 'src/mail/mail.module';
import { EndpointProxyModule } from 'src/integration/endpoint-proxy.module';
import { VehiculosModule } from 'src/vehiculos/vehiculos.module';
import { UbicacionModule } from 'src/ubicacion/ubicacion.module';
import { ReportesController } from './reportes.controller';
import { ReportesPdfService } from './reportes-pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { ReporteImagenService } from './reporte-imagen.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turnos,
      BitacoraVehiculo,
      IncidenciaAccidente,
      IncidenciaGasolina,
      InspeccionVehiculoEx,
    ]),
    TenantFilterModule,
    MailModule,
    EndpointProxyModule,
    VehiculosModule,
    UbicacionModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesPdfService, PuppeteerPdfService, ReporteImagenService],
  exports: [ReportesPdfService],
})
export class ReportesModule {}
