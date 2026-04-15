import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { UpdateTurnoEstatusDto } from './dto/update-turno-estatus.dto';
import { CierreBitacoraVehiculoDto } from './dto/cierre-bitacora-vehiculo.dto';
import { RegistrarTableroBitacoraDto } from './dto/registrar-tablero-bitacora.dto';
import { RegistrarTestigosBitacoraDto } from './dto/registrar-testigos-bitacora.dto';
import { RegistrarNivelesFluidosBitacoraDto } from './dto/registrar-niveles-fluidos-bitacora.dto';
import { RegistrarLucesBitacoraDto } from './dto/registrar-luces-bitacora.dto';
import { RegistrarDocumentacionBitacoraDto } from './dto/registrar-documentacion-bitacora.dto';
import { RegistrarAccesoriosBitacoraDto } from './dto/registrar-accesorios-bitacora.dto';
import { RegistrarInspeccionVehiculoExBitacoraDto } from './dto/registrar-inspeccion-vehiculo-ex-bitacora.dto';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

const TURNOS_CREATE_UPLOAD = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: unknown, file: Express.Multer.File, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten PNG, JPG, JPEG o PDF'));
    }
    cb(null, true);
  },
};

const TURNOS_TABLERO_UPLOAD = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: unknown, file: Express.Multer.File, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten PNG, JPG o JPEG'));
    }
    cb(null, true);
  },
};

const TURNOS_INSPECCION_EX_UPLOAD = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: unknown, file: Express.Multer.File, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten PNG, JPG o JPEG'));
    }
    cb(null, true);
  },
};

const TURNOS_CIERRE_UPLOAD = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: unknown, file: Express.Multer.File, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten PNG, JPG o JPEG'));
    }
    cb(null, true);
  },
};

@ApiTags('Turnos')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2, 3)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear turno (abrir turno)',
    description:
      'multipart/form-data: latitud, longitud, imagen evidenciaApertura. OCR behaviorIQ obtiene la placa (confianza > 0.7); el vehículo debe existir en tabla sombra.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['latitud', 'longitud'],
      properties: {
        latitud: { type: 'number', example: 18.9242156 },
        longitud: { type: 'number', example: -99.2340987 },
        evidenciaAperturaUrl: {
          type: 'string',
          description: 'Solo si no hay archivo (sin OCR)',
        },
        evidenciaApertura: {
          type: 'string',
          format: 'binary',
          description: 'Imagen para OCR de placa y evidencia en S3',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Turno creado; data incluye vehiculoPorPlaca (proxy GET vehículo por placa a Next, mismo flujo que VehiculosService.findOneByPlaca)',
  })
  @ApiResponse({
    status: 400,
    description:
      'Sin imagen, OCR bajo umbral, placa no en sombra, sin evidencia o turno activo',
  })
  @UseInterceptors(FileInterceptor('evidenciaApertura', TURNOS_CREATE_UPLOAD))
  async create(
    @Body() dto: CreateTurnoDto,
    @UploadedFile() evidenciaApertura: Express.Multer.File,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUsuario = req.user.userId;
    const idUser = req.user.userId;
    return this.turnosService.create(
      dto,
      idCliente,
      idUsuario,
      idUser,
      evidenciaApertura,
      req,
    );
  }

  @Get('list')
  @ApiOperation({ summary: 'Lista de turnos activos del cliente' })
  async findAllList(@Request() req): Promise<ApiResponseCommon> {
    const idCliente = req.user.idCliente;
    return this.turnosService.findAllList(idCliente);
  }

  @Get(':page/:limit')
  @ApiOperation({ summary: 'Lista paginada de turnos (todos)' })
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const idCliente = Number(req.user.idCliente);
    return this.turnosService.findAll(idCliente, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener turno por ID' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const idCliente = req.user.idCliente;
    return this.turnosService.findOne(id, idCliente);
  }

  @Patch('tablero')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar lectura de tablero (bitácora en turno en curso)',
    description:
      'multipart/form-data: idBitacoraVehiculo, kilometraje, imagen fotoTablero. Sube a S3 carpeta tablero y enlaza BitacoraVehiculo.IdTablero.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idBitacoraVehiculo', 'kilometraje', 'fotoTablero'],
      properties: {
        idBitacoraVehiculo: { type: 'integer', example: 1 },
        kilometraje: { type: 'number', example: 45230.5 },
        fotoTablero: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del tablero (PNG, JPG, JPEG)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tablero registrado' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o tablero ya registrado',
  })
  @UseInterceptors(FileInterceptor('fotoTablero', TURNOS_TABLERO_UPLOAD))
  async registrarTableroBitacora(
    @Body() dto: RegistrarTableroBitacoraDto,
    @UploadedFile() fotoTablero: Express.Multer.File,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.registrarTableroDesdeBitacora(
      dto,
      idCliente,
      idUser,
      fotoTablero,
    );
  }

  @Patch('testigos')
  @ApiOperation({
    summary: 'Registrar testigos del vehículo (bitácora en turno en curso)',
    description:
      'JSON: idBitacoraVehiculo e indicadores (EstatusEnum 0/1). idTurno e idVehiculo se toman de la bitácora. Calcula estatus de la fila; enlaza BitacoraVehiculo.IdTestigosVehiculo.',
  })
  @ApiBody({ type: RegistrarTestigosBitacoraDto })
  @ApiResponse({ status: 200, description: 'Testigos registrados' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o testigos ya registrados',
  })
  async registrarTestigosBitacora(
    @Body() dto: RegistrarTestigosBitacoraDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.registrarTestigosDesdeBitacora(dto, idCliente);
  }

  @Patch('niveles-fluidos')
  @ApiOperation({
    summary: 'Registrar niveles de fluidos (bitácora en turno en curso)',
    description:
      'JSON: idBitacoraVehiculo y niveles opcionales (gasolina, aceite, bateria, anticongelante, liquidoFrenos). idTurno e idVehiculo desde la bitácora. Si algún valor enviado es menor a 25, estatus de fila = 1 (ACTIVO); si no, 0. Enlaza BitacoraVehiculo.IdNivelesFluidos.',
  })
  @ApiBody({ type: RegistrarNivelesFluidosBitacoraDto })
  @ApiResponse({ status: 200, description: 'Niveles de fluidos registrados' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o niveles ya registrados',
  })
  async registrarNivelesFluidosBitacora(
    @Body() dto: RegistrarNivelesFluidosBitacoraDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.registrarNivelesFluidosDesdeBitacora(dto, idCliente);
  }

  @Patch('luces-vehiculo')
  @ApiOperation({
    summary: 'Registrar luces del vehículo (bitácora en turno en curso)',
    description:
      'JSON: idBitacoraVehiculo y luces opcionales (EstatusEnum 0/1). idTurno e idVehiculo desde la bitácora. Si alguna luz enviada es ACTIVO (1), estatus de fila = 1; si no, 0. Enlaza BitacoraVehiculo.IdLucesVehiculo.',
  })
  @ApiBody({ type: RegistrarLucesBitacoraDto })
  @ApiResponse({ status: 200, description: 'Luces registradas' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o luces ya registradas',
  })
  async registrarLucesBitacora(
    @Body() dto: RegistrarLucesBitacoraDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.registrarLucesDesdeBitacora(dto, idCliente);
  }

  @Patch('documentacion-vehiculo')
  @ApiOperation({
    summary: 'Registrar documentación del vehículo (bitácora en turno en curso)',
    description:
      'JSON: idBitacoraVehiculo y campos opcionales (EstatusEnum 0/1). idTurno e idVehiculo desde la bitácora. Si algún campo enviado es ACTIVO (1), estatus de fila = 1; si no, 0. Enlaza BitacoraVehiculo.IdDocumentacionVehiculo.',
  })
  @ApiBody({ type: RegistrarDocumentacionBitacoraDto })
  @ApiResponse({ status: 200, description: 'Documentación registrada' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o documentación ya registrada',
  })
  async registrarDocumentacionBitacora(
    @Body() dto: RegistrarDocumentacionBitacoraDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.registrarDocumentacionDesdeBitacora(dto, idCliente);
  }

  @Patch('accesorios-vehiculo')
  @ApiOperation({
    summary: 'Registrar accesorios del vehículo (bitácora en turno en curso)',
    description:
      'JSON: idBitacoraVehiculo y campos opcionales (EstatusEnum 0/1). idTurno e idVehiculo desde la bitácora. Si algún campo enviado es ACTIVO (1), estatus de fila = 1; si no, 0. Enlaza BitacoraVehiculo.IdAccesoriosVehiculo.',
  })
  @ApiBody({ type: RegistrarAccesoriosBitacoraDto })
  @ApiResponse({ status: 200, description: 'Accesorios registrados' })
  @ApiResponse({
    status: 400,
    description:
      'Validación, bitácora inactiva, turno no en curso o accesorios ya registrados',
  })
  async registrarAccesoriosBitacora(
    @Body() dto: RegistrarAccesoriosBitacoraDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.registrarAccesoriosDesdeBitacora(dto, idCliente);
  }

  @Patch('inspeccion-vehiculo-ex')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar inspección exterior de daños (bitácora en turno en curso)',
    description:
      'multipart/form-data: idBitacoraVehiculo, ids de catálogo y evidenciaFotografica. idTurno e idVehiculo se resuelven desde la bitácora. Sube a S3 carpeta inspeccion-vehiculo-ex; permite varias filas por bitácora.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'idBitacoraVehiculo',
        'idCatVistaVehiculo',
        'idCatPartesVehiculoEx',
        'idCatTipoDano',
        'idCatGradoSeveridad',
        'evidenciaFotografica',
      ],
      properties: {
        idBitacoraVehiculo: { type: 'integer', example: 1 },
        idCatVistaVehiculo: { type: 'integer', example: 1 },
        idCatPartesVehiculoEx: { type: 'integer', example: 1 },
        idCatTipoDano: { type: 'integer', example: 1 },
        idCatGradoSeveridad: { type: 'integer', example: 1 },
        evidenciaFotografica: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de evidencia (PNG, JPG, JPEG)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Inspección exterior registrada' })
  @ApiResponse({
    status: 400,
    description: 'Validación, bitácora inactiva o turno no en curso',
  })
  @UseInterceptors(FileInterceptor('evidenciaFotografica', TURNOS_INSPECCION_EX_UPLOAD))
  async registrarInspeccionVehiculoExBitacora(
    @Body() dto: RegistrarInspeccionVehiculoExBitacoraDto,
    @UploadedFile() evidenciaFotografica: Express.Multer.File,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.registrarInspeccionVehiculoExDesdeBitacora(
      dto,
      idCliente,
      idUser,
      evidenciaFotografica,
    );
  }

  @Patch('bitacora/cierre')
  @ApiOperation({
    summary: 'Cierre de bitácora (apertura o cierre según estado del turno)',
    description:
      'JSON: idBitacoraVehiculo. Si el turno no tiene longitudCierre, latitudCierre ni fechaCierre, cierra la bitácora de apertura y sincroniza vehículo por placa. Si las tres tienen valor, cierra la bitácora de cierre y finaliza el turno (INACTIVO + estatus FINALIZADO). Requiere bitácora completa (sin FKs nulas).',
  })
  @ApiBody({ type: CierreBitacoraVehiculoDto })
  @ApiResponse({ status: 200, description: 'Bitácora cerrada (flujo apertura o cierre)' })
  @ApiResponse({
    status: 400,
    description: 'Bitácora incompleta, inactiva, turno inconsistente o bitácora no coincide con apertura/cierre',
  })
  async cierreBitacoraVehiculo(
    @Body() dto: CierreBitacoraVehiculoDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    return this.turnosService.cierreBitacoraVehiculo(dto, idCliente, req);
  }

  @Patch()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cerrar turno con geolocalización y evidencia',
    description:
      'multipart/form-data: idTurno (debe coincidir con :id), latitud, longitud, evidenciaCierre. Sube imagen a S3 (módulo turnos), guarda LatitudCierre/LongitudCierre, FechaCierre, Duración (horas desde FechaApertura), BitacoraVehiculo de cierre (tipo 2) y marca turno como finalizado.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idTurno', 'latitud', 'longitud', 'evidenciaCierre'],
      properties: {
        idTurno: { type: 'integer', example: 1 },
        latitud: { type: 'number', example: 19.4326077 },
        longitud: { type: 'number', example: -99.133208 },
        evidenciaCierre: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de evidencia de cierre (PNG, JPG, JPEG)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Turno cerrado' })
  @ApiResponse({
    status: 400,
    description: 'Validación, turno no en curso, ya cerrado o sin evidencia',
  })
  @UseInterceptors(FileInterceptor('evidenciaCierre', TURNOS_CIERRE_UPLOAD))
  async update(
    @Body() dto: UpdateTurnoDto,
    @UploadedFile() evidenciaCierre: Express.Multer.File,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.update(dto, idCliente, idUser, evidenciaCierre);
  }

  @Patch(':id/estatus')
  @ApiOperation({ summary: 'Cambiar estatus del turno (activar/desactivar)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateTurnoEstatusDto })
  async updateEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTurnoEstatusDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.updateEstatus(id, dto, idCliente, idUser);
  }

  @Delete(':id')
  @Roles(1)
  @ApiOperation({ summary: 'Eliminar turno (baja lógica)' })
  @ApiParam({ name: 'id' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.remove(id, idCliente, idUser);
  }
}
