import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EndpointProxyService } from 'src/integration/endpoint-proxy.service';
import { AuthLoginShadowService } from './auth-login-shadow.service';
import { ValidateFaceDto } from './dto/validate-face.dto';

const THROTTLE_VALIDATE_FACE_LIMIT = Number(
  process.env.THROTTLE_VALIDATE_FACE_LIMIT ?? process.env.THROTTLE_LOGIN_LIMIT ?? 5,
);
const THROTTLE_VALIDATE_FACE_TTL_MS = Number(
  process.env.THROTTLE_VALIDATE_FACE_TTL_MS ??
    process.env.THROTTLE_LOGIN_TTL_MS ??
    60000,
);

/**
 * IdCliente fijo en el BFF Next (no configurable desde ShiftControl; solo referencia en logs/docs).
 */
const VALIDATE_FACE_UPSTREAM_ID_CLIENTE_FIJO = 2;

/**
 * Proxy hacia Next `POST …/api/auth/validateFace` (login por rostro / BehaviorIQ en upstream).
 */
@ApiTags('Autenticación')
@Controller('auth')
export class AuthNextFaceProxyController {
  private readonly logger = new Logger(AuthNextFaceProxyController.name);

  constructor(
    private readonly endpointProxy: EndpointProxyService,
    private readonly authLoginShadow: AuthLoginShadowService,
  ) {}

  @Post('validateFace')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: THROTTLE_VALIDATE_FACE_LIMIT,
      ttl: THROTTLE_VALIDATE_FACE_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Login por reconocimiento facial (BehaviorIQ)',
    description:
      'Proxy BFF hacia Next `POST …/api/auth/validateFace`. En upstream el IdCliente es fijo (= ' +
      VALIDATE_FACE_UPSTREAM_ID_CLIENTE_FIJO +
      ', no configurable desde el cliente). idSolución es fija interna en Next (=2). ' +
      'Devuelve `token`, `refreshToken` y `expiresIn`; el access token puede incluir el claim `face` (idRostro). ' +
      'El cliente no envía credenciales BehaviorIQ. Si la respuesta es 2xx y trae `token`, se actualizan tablas sombra ' +
      '(`Clientes`, `Usuarios`) y `IdFaceAuth` cuando el JWT trae `face`.',
  })
  @ApiBody({ type: ValidateFaceDto })
  @ApiOkResponse({
    description:
      '`token`, `refreshToken` y `expiresIn`; el access token puede incluir el claim `face` (idRostro) cuando Next lo emite en este flujo',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
        expiresIn: 21600,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Rostro no válido o sin autorización (mensaje según Next)',
  })
  @ApiNotFoundResponse({
    description: 'Sin vínculo local con idRostro u otro recurso ausente en Next',
  })
  @ApiBadRequestResponse({ description: 'Body inválido (embeddings, etc.)' })
  @ApiInternalServerErrorResponse({ description: 'No se pudo contactar Next' })
  async validateFace(
    @Body() dto: ValidateFaceDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(
      `HTTP POST auth/validateFace → upstream Next (idCliente fijo en servidor=${VALIDATE_FACE_UPSTREAM_ID_CLIENTE_FIJO})`,
    );
    const r = await this.endpointProxy.forwardPost('auth/validateFace', dto, req);
    this.logger.log(`Proxy ← POST auth/validateFace status=${r.status}`);
    await this.authLoginShadow.applyShadowSyncFromLoginResponse(r.data, r.status);
    res.status(r.status);
    return r.data;
  }
}
