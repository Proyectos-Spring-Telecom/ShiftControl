import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthQueryGuard } from 'src/guard/jwt-auth-query.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { MailService } from 'src/mail/mail.service';
import { ReportesPdfService } from './reportes-pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { FiltroReporteVehiculoDto } from './dto/filtro-reporte-vehiculo.dto';
import { EnviarReporteTurnoDto, EnviarReporteVehiculoDto } from './dto/enviar-reporte.dto';

function escHtmlEmail(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@ApiTags('Reportes PDF')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthQueryGuard, RolesGuard)
@Roles()
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportesPdfService: ReportesPdfService,
    private readonly puppeteerPdfService: PuppeteerPdfService,
    private readonly mailService: MailService,
  ) {}

  @Post('turno/:id/enviar')
  @ApiOperation({
    summary: 'Envía reporte PDF de un turno por correo electrónico',
    description: 'Genera el PDF del turno y lo envía como adjunto al correo indicado.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del turno' })
  @ApiBody({ type: EnviarReporteTurnoDto })
  @ApiResponse({ status: 200, description: 'Correo enviado' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async enviarReporteTurno(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarReporteTurnoDto,
    @Request() req: { user: { idCliente: number } },
  ): Promise<{ status: string; message: string }> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente);
    const html = this.reportesPdfService.generarHtmlTurno(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(html);
    if (!pdfBuffer?.length) {
      throw new InternalServerErrorException({ message: 'No se pudo generar el PDF del turno' });
    }

    const placasRaw = String((data.turno['placas'] as string | undefined) ?? 'N/A');
    const placas = escHtmlEmail(placasRaw);
    const asunto = dto.asunto ?? `Reporte de Turno #${id} — ${placasRaw}`;
    const nombreArchivo = `reporte-turno-${id}.pdf`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Open Sans', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="550px" style="background-color: #FFFFFF; border-radius: 13px; box-shadow: rgba(100,100,111,0.2) 0px 7px 29px 0px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color: #1a1a2e; color: #FFFFFF; padding: 1.5rem;" align="center">
            <h2 style="margin: 0; font-size: 22px;">ShiftControl</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 2rem;" align="center">
            <h3 style="color: #1a1a2e; font-size: 24px;">Reporte de Turno #${id}</h3>
            <p style="color: #333; font-size: 16px;">Se adjunta el reporte del turno con placas <strong>${placas}</strong>.</p>
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">Abre el archivo PDF adjunto para ver el detalle completo del turno.</p>
          </td>
        </tr>
        <tr><td style="padding: 0 2rem;"><hr style="border: none; height: 2px; background-color: rgba(226,226,226,0.589);"></td></tr>
        <tr>
          <td style="padding: 0 2rem 25px 2rem; color: #666; font-size: 14px;">
            <p><strong>Nota:</strong> Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #1a1a2e; color: #FFFFFF; padding: 2rem;" align="center">
            <p style="margin: 0; font-size: 13px;">© ShiftControl</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.mailService.sendReportEmail(
      dto.destinatario,
      asunto,
      emailHtml,
      pdfBuffer,
      nombreArchivo,
    );

    return {
      status: 'success',
      message: `Reporte de turno #${id} enviado a ${dto.destinatario}`,
    };
  }

  @Post('vehiculo/:id/enviar')
  @ApiOperation({
    summary: 'Envía reporte PDF de un vehículo por correo electrónico',
    description: 'Genera el PDF del vehículo y lo envía como adjunto al correo indicado.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del vehículo' })
  @ApiBody({ type: EnviarReporteVehiculoDto })
  @ApiResponse({ status: 200, description: 'Correo enviado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async enviarReporteVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarReporteVehiculoDto,
    @Request() req: { user: { idCliente: number } },
  ): Promise<{ status: string; message: string }> {
    const idCliente = Number(req.user.idCliente);
    const fi = dto.fechaInicio ? new Date(dto.fechaInicio) : undefined;
    const ff = dto.fechaFin ? new Date(dto.fechaFin) : undefined;

    const data = await this.reportesPdfService.obtenerDatosVehiculo(id, idCliente, fi, ff);
    const html = this.reportesPdfService.generarHtmlVehiculo(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(html);
    if (!pdfBuffer?.length) {
      throw new InternalServerErrorException({ message: 'No se pudo generar el PDF del vehículo' });
    }

    const placasRaw = data.vehiculo.placas ?? 'N/A';
    const placas = escHtmlEmail(placasRaw);
    const asunto = dto.asunto ?? `Reporte de Vehículo — ${placasRaw}`;
    const nombreArchivo = `reporte-vehiculo-${id}.pdf`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Open Sans', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="550px" style="background-color: #FFFFFF; border-radius: 13px; box-shadow: rgba(100,100,111,0.2) 0px 7px 29px 0px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color: #1a1a2e; color: #FFFFFF; padding: 1.5rem;" align="center">
            <h2 style="margin: 0; font-size: 22px;">ShiftControl</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 2rem;" align="center">
            <h3 style="color: #1a1a2e; font-size: 24px;">Reporte de Vehículo — ${placas}</h3>
            <p style="color: #333; font-size: 16px;">Se adjunta el reporte del vehículo con placas <strong>${placas}</strong>.</p>
            <table cellpadding="8" cellspacing="0" style="margin-top: 15px; font-size: 14px; color: #333;">
              <tr><td style="text-align: left;"><strong>Turnos registrados:</strong></td><td>${data.totalTurnos}</td></tr>
              <tr><td style="text-align: left;"><strong>Incidencias accidente:</strong></td><td>${data.totalIncidenciasAccidente}</td></tr>
              <tr><td style="text-align: left;"><strong>Cargas de gasolina:</strong></td><td>${data.totalIncidenciasGasolina}</td></tr>
              <tr><td style="text-align: left;"><strong>Inspecciones:</strong></td><td>${data.totalInspecciones}</td></tr>
            </table>
            <p style="color: #718096; font-size: 14px; margin-top: 20px;">Abre el archivo PDF adjunto para ver el detalle completo.</p>
          </td>
        </tr>
        <tr><td style="padding: 0 2rem;"><hr style="border: none; height: 2px; background-color: rgba(226,226,226,0.589);"></td></tr>
        <tr>
          <td style="padding: 0 2rem 25px 2rem; color: #666; font-size: 14px;">
            <p><strong>Nota:</strong> Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #1a1a2e; color: #FFFFFF; padding: 2rem;" align="center">
            <p style="margin: 0; font-size: 13px;">© ShiftControl</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.mailService.sendReportEmail(
      dto.destinatario,
      asunto,
      emailHtml,
      pdfBuffer,
      nombreArchivo,
    );

    return {
      status: 'success',
      message: `Reporte de vehículo ${placasRaw} enviado a ${dto.destinatario}`,
    };
  }

  @Get('turno/:id/html')
  @ApiOperation({ summary: 'Vista previa HTML — reporte de turno' })
  @ApiParam({ name: 'id', description: 'ID del turno' })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT (alternativa al header Authorization; útil para abrir en el navegador con query string)',
  })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'HTML del reporte' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async reporteTurnoHtml(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { idCliente: number } },
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente);
    const reportHtml = this.reportesPdfService.generarHtmlTurno(data);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(reportHtml);
  }

  @Get('turno/:id')
  @ApiOperation({ summary: 'Descargar PDF — reporte de turno' })
  @ApiParam({ name: 'id', description: 'ID del turno' })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT (alternativa al header Authorization; útil para abrir en el navegador con query string)',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async reporteTurno(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { idCliente: number } },
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente);
    const reportHtml = this.reportesPdfService.generarHtmlTurno(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(reportHtml);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-turno-${id}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  }

  @Get('vehiculo/:id/html')
  @ApiOperation({ summary: 'Vista previa HTML — reporte de vehículo' })
  @ApiParam({ name: 'id', description: 'ID del vehículo (sombra)' })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT (alternativa al header Authorization; útil para abrir en el navegador con query string)',
  })
  @ApiQuery({ name: 'fechaInicio', required: false })
  @ApiQuery({ name: 'fechaFin', required: false })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'HTML del reporte' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async reporteVehiculoHtml(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FiltroReporteVehiculoDto,
    @Request() req: { user: { idCliente: number } },
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const fi = query.fechaInicio ? new Date(query.fechaInicio) : undefined;
    const ff = query.fechaFin ? new Date(query.fechaFin) : undefined;
    const data = await this.reportesPdfService.obtenerDatosVehiculo(id, idCliente, fi, ff);
    const reportHtml = this.reportesPdfService.generarHtmlVehiculo(data);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(reportHtml);
  }

  @Get('vehiculo/:id')
  @ApiOperation({ summary: 'Descargar PDF — reporte de vehículo' })
  @ApiParam({ name: 'id', description: 'ID del vehículo (sombra)' })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT (alternativa al header Authorization; útil para abrir en el navegador con query string)',
  })
  @ApiQuery({ name: 'fechaInicio', required: false })
  @ApiQuery({ name: 'fechaFin', required: false })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async reporteVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FiltroReporteVehiculoDto,
    @Request() req: { user: { idCliente: number } },
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const fi = query.fechaInicio ? new Date(query.fechaInicio) : undefined;
    const ff = query.fechaFin ? new Date(query.fechaFin) : undefined;
    const data = await this.reportesPdfService.obtenerDatosVehiculo(id, idCliente, fi, ff);
    const reportHtml = this.reportesPdfService.generarHtmlVehiculo(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(reportHtml);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-vehiculo-${id}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  }
}
