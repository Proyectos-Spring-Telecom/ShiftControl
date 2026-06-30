import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Req,
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
import type { Response, Request } from 'express';
import { JwtAuthQueryGuard } from 'src/guard/jwt-auth-query.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { MailService } from 'src/mail/mail.service';
import { ReportesPdfService } from './reportes-pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { EnviarReporteTurnoDto } from './dto/enviar-reporte.dto';

type AuthenticatedRequest = Request & { user: { idCliente: number } };

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
  ) { }

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
    @Req() req: AuthenticatedRequest,
  ): Promise<{ status: string; message: string }> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente, req);
    const html = await this.reportesPdfService.generarHtmlTurno(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(html);
    if (!pdfBuffer?.length) {
      throw new InternalServerErrorException({ message: 'No se pudo generar el PDF del turno' });
    }

    const placasRaw = String((data.turno['placas'] as string | undefined) ?? 'N/A');
    const placas = escHtmlEmail(placasRaw);
    const asunto = dto.asunto ?? `Reporte de Turno #${id} — ${placasRaw}`;
    const nombreArchivo = this.reportesPdfService.buildNombreArchivoTurno(data.turno);

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Turno</title>
</head>
<body style="font-family: 'Open Sans', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table width="550px" style="background-color: #FFFFFF; border-radius: 13px; box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;" cellpadding="0" cellspacing="0">
                    <!-- Header -->
                    <tr>
                        <td  style="background-color: #1a1a2e; color: #FFFFFF; padding: 1rem; ">
                            <a href="#">
                                <img src="https://springtelecom.mx/assets/img/sitio_spring_white.png" alt="logo" style="height: 40px;">
                            </a>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td  style="padding: 0 2rem; "  align="center">
                            <h5 style="color: #1a1a2e; font-size: 30px; text-align:center">
                                Reporte de Turno
                            </h5>
                            <p style="color: #1a1a2e; font-family: 'Open Sans', sans-serif; font-size: 16px; text-align: center; margin-top: -30px;">Se adjunta el reporte del turno con placas <strong>${placas}</strong>. Abre el archivo PDF adjunto para ver el detalle del turno completado.</p>
                        </td>
                    </tr>
                    <!-- Divider -->
                    <tr><td  style="padding: 0 2rem; "><hr style="border: none; height: 2px; background-color: rgba(226, 226, 226, 0.589); margin-top: 25px;"></td></tr>
                    <tr>
                        <td  style="padding: 0 2rem; "><br>
                            <p style="margin: 0; font-size: 16px; font-family: 'Open Sans', sans-serif;"><strong>Nota: </strong>Este correo fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
                            <p >Atentamente,</p>
                            <p style="margin-top: -10px;"><strong>Spring Telecom</strong></p>
                        <br>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1a1a2e; color: #FFFFFF; padding: 2rem; " align="center">
                            <!-- Contenido del footer aquí -->                  
                            <h5 style="color: #FFFFFF; margin: 0; font-family: 'Open Sans', sans-serif; font-size: 13px;"><b>Gracias
                                por estar con nosotros.</b></h5><br>
                            <p style="margin: 0; font-size: 13px; font-family: 'Open Sans', sans-serif;">Si necesita ayuda o tiene
                                preguntas, siempre nos complace poder ayudarle. Comuníquese con nosotros enviándonos un correo
                                electrónico a monitoreo@springtelecom.mx</p>
                            <p style="margin: 0; font-size: 13px; font-family: 'Open Sans', sans-serif;">Atentamente,</p>
                            <p style="margin: 0; font-size: 13px; font-family: 'Open Sans', sans-serif;">Spring Telecom | © ShiftControl</p>
                            <br>
                            <p style="margin: 0; font-size: 9px; font-family: 'Open Sans', sans-serif;">Cuernavaca, Morelos. 
                                Monitoreo: 777 135 18 86</p>
                            <!-- Redes sociales y más -->
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
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
      message: `Reporte del turno Folio #${id} Placas ${placas} enviado a ${dto.destinatario}`,
    };
  }

  @Get('turno/:id/html')
  @ApiOperation({
    summary: 'Vista previa HTML — reporte de turno',
    description:
      'Datos vía TypeORM (turno, bitácoras, incidencias, inspecciones). ' +
      'Vehículo y operador enriquecidos con GET /api/vehiculos/placa/:placa y GET /api/usuarios/:id (Next).',
  })
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
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente, req);
    const reportHtml = await this.reportesPdfService.generarHtmlTurno(data);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(reportHtml);
  }

  @Get('turno/:id')
  @ApiOperation({
    summary: 'Descargar PDF — reporte de turno',
    description:
      'Datos vía TypeORM (turno, bitácoras, incidencias, inspecciones). ' +
      'Vehículo y operador enriquecidos con GET /api/vehiculos/placa/:placa y GET /api/usuarios/:id (Next).',
  })
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
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const idCliente = Number(req.user.idCliente);
    const data = await this.reportesPdfService.obtenerDatosTurno(id, idCliente, req);
    const reportHtml = await this.reportesPdfService.generarHtmlTurno(data);
    const pdfBuffer = await this.puppeteerPdfService.convertir(reportHtml);
    const nombreArchivo = this.reportesPdfService.buildNombreArchivoTurno(data.turno);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  }
}
