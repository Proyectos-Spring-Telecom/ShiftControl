import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { VehiculosService } from './vehiculos.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { Request, Response } from 'express';

@ApiTags('Vehiculos')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2, 3)
@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) { }

  @Post('sync')
  @ApiOperation({
    summary: 'Sincronizar vehículos desde Next',
    description:
      'Llama a Next API, trae todos los vehículos activos del cliente y los copia a la tabla sombra local (Id, IdCliente, Placas, FotoFrente, Marca, Modelo). Usar para carga inicial o resincronización manual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sincronización completada (incluye FotoFrente, Marca y Modelo si Next los envía)',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async sync(@Req() req: Request) {
    return this.vehiculosService.syncVehiculos(req);
  }

  @Get('list')
  @ApiOperation({ summary: 'Lista de vehículos (proxy a Next)' })
  @ApiQuery({
    name: 'soloActivos',
    required: false,
    description: 'Se reenvía a Next en la query (p. ej. true)',
  })
  @ApiResponse({ status: 200, description: 'Lista obtenida desde Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAllList(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.vehiculosService.findAllList(req);
    res.status(r.status);
    return r.data;
  }

  @Get('placa/:placa')
  @ApiOperation({
    summary: 'Buscar vehículo por placa (proxy a Next)',
    description:
      'Proxy a Next `GET {ENDPOINT_URL}/api/productos/vehiculos/placa/:placa`.\n\n' +
      'Reenvía el JWT del cliente. Next solo devuelve productos activos (`estatus = 1`) ' +
      'y aplica alcance por rol (global / jerarquía / cliente).\n\n' +
      'Respuesta 200: `{ data: { id, placa, numeroEconomico, anio, color, fotoFrente, km, ' +
      'capacidadLitros, estatus, fechaCreacion, idCliente, nombreCompleto, modeloId, modeloNombre, ' +
      'marcaId, marcaNombre, combustibleId, combustibleNombre } }`.\n\n' +
      'No incluye `tipoVehiculoId` / `tipoVehiculoNombre`. Errores 400/401/404 suelen ser texto plano.',
  })
  @ApiParam({
    name: 'placa',
    description: 'Placa del vehículo (se codifica hacia Next con encodeURIComponent)',
    example: 'A-06104-E',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehículo activo encontrado (contrato Next productivo)',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1, description: 'IdProducto' },
            placa: { type: 'string', example: 'A-06104-E' },
            numeroEconomico: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: '1',
            },
            anio: { oneOf: [{ type: 'integer' }, { type: 'null' }], example: 2019 },
            color: { oneOf: [{ type: 'string' }, { type: 'null' }], example: 'Rojo' },
            fotoFrente: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: null,
              description: 'URL S3 o null',
            },
            km: { oneOf: [{ type: 'number' }, { type: 'null' }], example: null },
            capacidadLitros: {
              oneOf: [{ type: 'number' }, { type: 'null' }],
              example: null,
            },
            estatus: { type: 'integer', example: 1 },
            fechaCreacion: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-13T20:26:00.000Z',
            },
            idCliente: { type: 'integer', example: 11 },
            nombreCompleto: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: 'transporterapido',
            },
            modeloId: { oneOf: [{ type: 'integer' }, { type: 'null' }], example: 16 },
            modeloNombre: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: 'Virtus',
            },
            marcaId: { oneOf: [{ type: 'integer' }, { type: 'null' }], example: 3 },
            marcaNombre: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: 'Volkswagen',
            },
            combustibleId: {
              oneOf: [{ type: 'integer' }, { type: 'null' }],
              example: null,
            },
            combustibleNombre: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              example: null,
            },
          },
        },
      },
      example: {
        data: {
          id: 1,
          placa: 'A-06104-E',
          numeroEconomico: '1',
          anio: 2019,
          color: 'Rojo',
          fotoFrente: null,
          km: null,
          capacidadLitros: null,
          estatus: 1,
          fechaCreacion: '2026-04-13T20:26:00.000Z',
          idCliente: 11,
          nombreCompleto: 'transporterapido',
          modeloId: 16,
          modeloNombre: 'Virtus',
          marcaId: 3,
          marcaNombre: 'Volkswagen',
          combustibleId: null,
          combustibleNombre: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Placa vacía/inválida, o varias placas iguales en el ámbito del rol (cuerpo suele ser texto plano)',
  })
  @ApiResponse({
    status: 404,
    description:
      'No hay vehículo activo con esa placa en el tenant permitido (cuerpo suele ser texto plano)',
  })
  @ApiResponse({
    status: 401,
    description: 'Sin token o token inválido (cuerpo suele ser texto plano)',
  })
  async findOneByPlaca(
    @Param('placa') placa: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.vehiculosService.findOneByPlaca(placa, req);
    res.status(r.status);
    return r.data;
  }

  @Get(':page/:limit')
  @ApiOperation({ summary: 'Lista paginada de vehículos (proxy a Next)' })
  @ApiParam({ name: 'page', description: 'Número de página' })
  @ApiParam({ name: 'limit', description: 'Registros por página' })
  @ApiQuery({
    name: 'soloActivos',
    required: false,
    description: 'Se reenvía a Next en la query (p. ej. true)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada obtenida desde Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.vehiculosService.findAll(page, limit, req);
    res.status(r.status);
    return r.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de vehículo por ID (proxy a Next)' })
  @ApiParam({
    name: 'id',
    description: 'ID del vehículo (mismo ID que en Next)',
  })
  @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado en Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.vehiculosService.findOne(id, req);
    res.status(r.status);
    return r.data;
  }
}
