import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuarios } from 'src/entities/Usuarios';
import { BehaviorIqFaceBffBaseController } from './behavioriq-face-bff.base';
import { EMBED_FACE_IMAGE_MULTER } from './embed-multer.config';
import { CreateRostroDto } from './dto/create-rostro.dto';
import { toBehaviorIqCrearRostroBody } from './rostro-request.mapper';
import { BehaviorIqEmbedService } from 'src/integration/behavioriq/behavioriq-embed.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Repository } from 'typeorm';

/**
 * BFF — Fase 1 y 2 del flujo “afiliar rostro”: validar pose y generar embedding.
 * Rutas públicas ShiftControl: `/api/embed/validate-pose`, `/api/embed`.
 */
@ApiTags('Embed (BehaviorIQ)')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('embed')
export class EmbedBehaviorIqController extends BehaviorIqFaceBffBaseController {
  constructor(behaviorIqEmbed: BehaviorIqEmbedService) {
    super(behaviorIqEmbed);
  }

  @Post('validate-pose')
  @ApiOperation({
    summary: 'Validar pose del rostro (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/embed/validate-pose`.\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Query:** `sample_index` obligatorio: `1` frente, `2` izquierda, `3` derecha.\n\n' +
      '**Body:** `multipart/form-data` con campo `file` (PNG o JPEG, máx. 12 MB).\n\n' +
      'Documentación: `docs/EMBED_BFF_SHIFTCONTROL.md`.',
  })
  @ApiQuery({
    name: 'sample_index',
    required: true,
    enum: ['1', '2', '3'],
    description: 'Índice de muestra',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({
    description: 'Resultado de validación de pose',
    schema: {
      example: { valid: true, reason: 'Pose correcta' },
      properties: {
        valid: { type: 'boolean' },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '`sample_index` no es 1/2/3, falta `file`, o tipo MIME no permitido',
  })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiResponse({ status: 403, description: 'Servicio de rostro no habilitado para el tenant' })
  @ApiServiceUnavailableResponse({ description: 'BehaviorIQ no disponible' })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
  @UseInterceptors(FileInterceptor('file', EMBED_FACE_IMAGE_MULTER))
  async validatePose(
    @Query('sample_index') sampleIndex: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!['1', '2', '3'].includes(sampleIndex)) {
      throw new BadRequestException('sample_index debe ser 1, 2 o 3');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar el campo file (imagen)');
    }
    const token = await this.behaviorIqServiceToken();
    return this.behaviorIqEmbed.validatePose(
      file,
      sampleIndex as '1' | '2' | '3',
      token,
    );
  }
  

  @Post()
  @ApiOperation({
    summary: 'Imagen → embedding 512D (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/embed`. Devuelve un vector numérico (típicamente 512 dimensiones, ArcFace).\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Body:** `multipart/form-data`, campo `file` (PNG o JPEG, máx. 12 MB).\n\n' +
      'Usar el mismo archivo que pasó `validate-pose` para esa muestra. Ver `docs/EMBED_BFF_SHIFTCONTROL.md`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({
    description: 'Embedding generado',
    schema: {
      example: { embedding: [0.01, -0.02] },
      properties: {
        embedding: {
          type: 'array',
          items: { type: 'number' },
          description: 'Vector 512D (ejemplo truncado)',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Falta `file` o archivo no permitido' })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiResponse({ status: 400, description: 'BehaviorIQ: no es imagen válida' })
  @ApiResponse({ status: 404, description: 'BehaviorIQ: no se detectó rostro en la imagen' })
  @ApiResponse({ status: 403, description: 'Servicio de rostro no habilitado' })
  @ApiServiceUnavailableResponse({ description: 'BehaviorIQ no disponible' })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
  @UseInterceptors(FileInterceptor('file', EMBED_FACE_IMAGE_MULTER))
  async embed(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar el campo file (imagen)');
    }
    const token = await this.behaviorIqServiceToken();
    return this.behaviorIqEmbed.embed(file, token);
  }
  

  @Post('liveness-check')
  @ApiOperation({
    summary: 'Prueba de vida (liveness) con 2 imágenes (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/embed/liveness-check`.\n\n' +
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Body:** `multipart/form-data`, campo `files` con exactamente 2 imágenes (PNG o JPEG, máx. 12 MB c/u).\n\n' +
      'Valida movimiento entre capturas y anti-spoof. Devuelve `passed`, `reason`, `score`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          minItems: 2,
          maxItems: 2,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Resultado de prueba de vida',
    schema: {
      example: { passed: true, reason: 'Movimiento detectado', score: 0.91 },
      properties: {
        passed: { type: 'boolean' },
        reason: { type: 'string', nullable: true },
        score: { type: 'number', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Se requieren exactamente 2 imágenes en `files` y MIME permitido',
  })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiResponse({ status: 403, description: 'Servicio de rostro no habilitado para el tenant' })
  @ApiServiceUnavailableResponse({ description: 'BehaviorIQ no disponible' })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
  @UseInterceptors(FilesInterceptor('files', 2, EMBED_FACE_IMAGE_MULTER))
  async livenessCheck(@UploadedFiles() files: Express.Multer.File[]) {
    if (!Array.isArray(files) || files.length !== 2) {
      throw new BadRequestException('Debe adjuntar exactamente 2 imágenes en el campo files');
    }
    const token = await this.behaviorIqServiceToken();
    return this.behaviorIqEmbed.livenessCheck(files, token);
  }
}

/**
 * BFF — Fase 3 del flujo “afiliar rostro”: alta en BehaviorIQ con embeddings.
 * Ruta ShiftControl: `POST /api/rostros` (misma convención que el API remoto).
 */
@ApiTags('Rostros (BehaviorIQ)')
@Controller('rostros')
export class RostrosBehaviorIqController extends BehaviorIqFaceBffBaseController {
  constructor(
    behaviorIqEmbed: BehaviorIqEmbedService,
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
  ) {
    super(behaviorIqEmbed);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar rostro con embeddings (proxy BehaviorIQ)',
    description:
      'Equivale a `POST {BEHAVIORIQ_BASE_URL}/rostros`.\n\n' +
      'Después de crear el rostro en BehaviorIQ, ShiftControl llama a Next ' +
      '`POST {ENDPOINT_URL}/api/usuarios/face-auth` con el mismo `Authorization` y body `{ idFaceAuth }` ' +
      '(id devuelto por BehaviorIQ).\n\n' +
      '**Auth:** `Authorization: Bearer <JWT ShiftControl>` (Next + guards locales).\n\n' +
      '**Cuerpo:** datos personales + `embeddings` o `embeddingsList` (1–10 vectores 512D), ' +
      'obtenidos con `POST /api/embed`.\n\n' +
      'Hacia BehaviorIQ se envían siempre `idCliente=2` e `idSolucion=2` (no van en el body del cliente). ' +
      'Ver `docs/EMBED_BFF_SHIFTCONTROL.md` y `docs/PROCESO_BEHAVIORIQ.MD`.',
  })
  @ApiBody({ type: CreateRostroDto })
  @ApiResponse({
    status: 201,
    description:
      'BehaviorIQ: rostro creado; Next: `IdFaceAuth` registrado (`POST …/api/usuarios/face-auth`).',
    schema: { example: { success: true, id: 123 } },
  })
  @ApiUnauthorizedResponse({
    description:
      'JWT de ShiftControl inválido o ausente; o Next rechazó el Bearer al sincronizar `face-auth` (401).',
  })
  @ApiForbiddenResponse({ description: 'Registro fuera del cliente/solución permitido (BehaviorIQ)' })
  @ApiConflictResponse({
    description:
      'Rostro duplicado en BehaviorIQ (409), o usuario ya tiene rostro en tabla sombra ShiftControl',
  })
  @ApiBadRequestResponse({
    description:
      'Body inválido (falta `embeddings`/`embeddingsList`, más de 10 muestras, etc.). ' +
      'Tras crear en BehaviorIQ, Next puede responder **400**: el usuario ya tiene `IdFaceAuth` (rostro afiliado).',
  })
  @ApiNotFoundResponse({
    description:
      'Next (`POST …/api/usuarios/face-auth`): usuario del token no encontrado (404).',
  })
  @ApiResponse({
    status: 200,
    description: 'Algunos despliegues de BehaviorIQ responden 200 con success',
  })
  @ApiInternalServerErrorResponse({
    description:
      'Error al comunicar con BehaviorIQ o con Next; o respuesta inesperada al sincronizar `face-auth`.',
  })
  async crear(@Body() dto: CreateRostroDto, @Req() req: Request) {
    const userId = Number((req as Request & { user?: { userId?: number } }).user?.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('JWT de ShiftControl inválido o ausente');
    }

    
    const usuario = await this.usuariosRepository.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new BadRequestException('No se encontró el usuario autenticado');
    }
    if (usuario.idFaceAuth != null) {
      throw new ConflictException('Este usuario ya tiene un rostro registrado');
    }

    const body = toBehaviorIqCrearRostroBody(dto);
    const token = await this.behaviorIqServiceToken();
    const authorization =
      typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
    if (!authorization) {
      throw new UnauthorizedException('Authorization ausente para sincronizar con Next');
    }

    return this.behaviorIqEmbed.crearRostro(body, token, {
      nextAuthorization: authorization,
    });
  }
}
