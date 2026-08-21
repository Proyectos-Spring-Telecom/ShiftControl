import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehiculos } from 'src/entities/Vehiculos';
import { BehaviorIqPlateService } from 'src/integration/behavioriq/behavioriq-plate.service';
import { Repository } from 'typeorm';
import { CreatePlacaDto } from './dto/create-placa.dto';
import { ValidarPlacaQueryDto } from './dto/validar-placa.query.dto';
import { toBehaviorIqCreatePlacaBody } from './placa-request.mapper';
import { PLACAS_IMAGE_MULTER } from './placas-multer.config';
import { PlacasBffBaseController } from './placas-bff.base';

@ApiTags('Placa (proxy) (BehaviorIQ)')
@Controller('plate')
export class PlateProxyBehaviorIqController extends PlacasBffBaseController {
  constructor(behaviorIqPlate: BehaviorIqPlateService) {
    super(behaviorIqPlate);
  }

  @Post('read')
  @ApiOperation({
    summary: 'Detección + OCR de placa (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/plate/read` ([Swagger BehaviorIQ](https://spcode.ddns.net/api-behavioriq/docs#/Placa%20(proxy)/PlateProxyController_read)).\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Body:** `multipart/form-data` con campo `file` (PNG/JPEG, máx. 12 MB).\n\n' +
      '**Errores:** se propaga el mismo código HTTP que BehaviorIQ (400, 403, 422, 503, etc.); el `message` se formaliza para el usuario final.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Número de placa detectado (mismo contrato que BehaviorIQ)',
    schema: { example: { plate_number: 'ABC-123', confidence: 0.94 } },
  })
  @ApiResponse({
    status: 201,
    description: 'Número de placa detectado (algunos despliegues responden 201)',
  })
  @ApiBadRequestResponse({
    description:
      'No se detectó placa o parámetros inválidos (alineado a BehaviorIQ 400). También archivo vacío o MIME no permitido en ShiftControl.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT de ShiftControl inválido/ausente, o BehaviorIQ respondió 401',
  })
  @ApiForbiddenResponse({
    description: 'Servicio de placa no habilitado para la solución (BehaviorIQ 403)',
  })
  @ApiResponse({
    status: 422,
    description:
      'Imagen no procesable (p. ej. validación de archivo en BehaviorIQ). Se propaga el 422; el mensaje se formaliza para el usuario final.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Servicio de placa no disponible (BehaviorIQ 503)',
  })
  @ApiInternalServerErrorResponse({
    description: 'Fallo de red/comunicación con BehaviorIQ o respuesta incompleta',
  })
  @UseInterceptors(FileInterceptor('file', PLACAS_IMAGE_MULTER))
  async read(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Debe adjuntar la imagen de la placa. Vuelva a capturarla e intente nuevamente.',
      );
    }
    const token = await this.behaviorIqServiceToken();
    return this.behaviorIqPlate.readPlate(file, token);
  }
}

@ApiTags('Placas (BehaviorIQ)')
@Controller('placas')
export class PlacasBehaviorIqController extends PlacasBffBaseController {
  constructor(
    behaviorIqPlate: BehaviorIqPlateService,
    @InjectRepository(Vehiculos)
    private readonly vehiculosRepository: Repository<Vehiculos>,
  ) {
    super(behaviorIqPlate);
  }

  private normalizePlacaKey(value: string): string {
    return value.toUpperCase().replace(/[-\s]/g, '');
  }

  @Get('validar')
  @ApiOperation({
    summary: 'Validar si una placa está registrada (proxy BehaviorIQ)',
    description:
      'Equivale a `GET {BEHAVIORIQ_BASE_URL}/placas/validar`.\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Query:** `numeroPlaca` obligatorio; `idCliente`, `idSolucion`, `latitud`, `longitud` opcionales (útil para root).',
  })
  @ApiOkResponse({
    description: 'Estado de registro de la placa',
    schema: {
      example: {
        registered: true,
        idPlaca: 456,
        placa: 'ABC-123',
        marca: 'Nissan',
        modelo: 'NP300',
        anio: 2021,
        color: 'Blanco',
        economico: 'RSP-01',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Sin permiso o servicio de placa no habilitado' })
  @ApiBadRequestResponse({ description: 'Falta `numeroPlaca` o query inválida' })
  @ApiServiceUnavailableResponse({ description: 'BehaviorIQ no disponible' })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
  async validar(@Query() query: ValidarPlacaQueryDto) {
    const token = await this.behaviorIqServiceToken();
    return this.behaviorIqPlate.validarPlaca(
      {
        numeroPlaca: query.numeroPlaca,
        idCliente: query.idCliente,
        idSolucion: query.idSolucion,
        latitud: query.latitud,
        longitud: query.longitud,
      },
      token,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar placa (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/placas`.\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Body:** `numeroPlaca` obligatorio; hacia BehaviorIQ se envían siempre `idCliente=2` e `idSolucion=2` (no van en el body del cliente).',
  })
  @ApiBody({ type: CreatePlacaDto })
  @ApiCreatedResponse({
    description: 'Placa registrada',
    schema: {
      example: {
        idPlaca: 42,
        numeroPlaca: 'ABC-12-34',
        economico: 'Eco-001',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Solo puede registrar en su cliente/solución (o root)' })
  @ApiConflictResponse({
    description:
      'Placa ya registrada en BehaviorIQ, o el vehículo ya tiene `IdVehiculoAuth` asignado',
  })
  @ApiBadRequestResponse({
    description: 'La placa no existe en Vehiculos o no se recibió `idPlaca` al crear en BehaviorIQ',
  })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
  async crear(@Body() dto: CreatePlacaDto) {
    const placaNorm = this.normalizePlacaKey(dto.numeroPlaca ?? '');
    const vehiculo = await this.vehiculosRepository
      .createQueryBuilder('v')
      .where("REPLACE(REPLACE(UPPER(v.placas), '-', ''), ' ', '') = :placaNorm", {
        placaNorm,
      })
      .getOne();

    if (!vehiculo) {
      throw new BadRequestException(
        `No se puede continuar: no existe vehículo para la placa ${dto.numeroPlaca}`,
      );
    }
    if (vehiculo.idVehiculoAuth != null) {
      throw new ConflictException(
        `No se puede continuar: la placa ${dto.numeroPlaca} ya tiene IdVehiculoAuth asignado`,
      );
    }

    const token = await this.behaviorIqServiceToken();
    const body = toBehaviorIqCreatePlacaBody(dto);
    const result = await this.behaviorIqPlate.createPlaca(body, token);

    if (result.status === 201) {
      const idPlaca = Number(result.data?.idPlaca);
      if (!Number.isFinite(idPlaca) || idPlaca <= 0) {
        throw new BadRequestException(
          'No se puede continuar: BehaviorIQ creó la placa pero no regresó idPlaca válido',
        );
      }
      vehiculo.idVehiculoAuth = idPlaca;
      await this.vehiculosRepository.save(vehiculo);
    }

    if (result.status === 200 && result.data?.idPlaca == null) {
      throw new InternalServerErrorException(
        'BehaviorIQ respondió 200 sin idPlaca; no se pudo enlazar con Vehiculos',
      );
    }

    return result.data;
  }
}
