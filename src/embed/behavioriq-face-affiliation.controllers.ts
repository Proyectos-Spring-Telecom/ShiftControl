import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
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
      '**Auth:** enviar solo `Authorization: Bearer <JWT ShiftControl>`.\n\n' +
      '**Cuerpo:** datos personales + `embeddings` o `embeddingsList` (1–10 vectores 512D), ' +
      'obtenidos con `POST /api/embed`.\n\n' +
      'Usuario no root en BehaviorIQ: `idCliente` e `idSolucion` deben coincidir con el token allí. ' +
      'Ver `docs/EMBED_BFF_SHIFTCONTROL.md` y `docs/PROCESO_BEHAVIORIQ.MD`.',
  })
  @ApiBody({ type: CreateRostroDto })
  @ApiResponse({
    status: 201,
    description: 'Creado en BehaviorIQ',
    schema: { example: { success: true, id: 123 } },
  })
  @ApiUnauthorizedResponse({ description: 'JWT de ShiftControl inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Registro fuera del cliente/solución permitido' })
  @ApiConflictResponse({ description: 'Rostro duplicado en la solución' })
  @ApiBadRequestResponse({
    description: 'Falta `embeddings` y `embeddingsList`, o más de 10 muestras en `embeddingsList`',
  })
  @ApiResponse({
    status: 200,
    description: 'Algunos despliegues de BehaviorIQ responden 200 con success',
  })
  @ApiInternalServerErrorResponse({ description: 'Error al comunicar con BehaviorIQ' })
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
    const response = await this.behaviorIqEmbed.crearRostro(body, token);

    if (response.success === true) {
      if (!Number.isFinite(response.id)) {
        throw new InternalServerErrorException(
          'BehaviorIQ respondió success=true pero sin id de rostro',
        );
      }
      usuario.idFaceAuth = Number(response.id);
      await this.usuariosRepository.save(usuario);
    }

    return response;
  }
}
