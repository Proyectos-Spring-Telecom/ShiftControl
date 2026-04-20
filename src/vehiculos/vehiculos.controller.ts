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
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Sincronizar vehículos desde Next',
    description:
      'Llama a Next API, trae todos los vehículos activos del cliente y los copia a la tabla sombra local (Id, IdCliente, Placas, FotoFrente). Usar para carga inicial o resincronización manual.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización completada (incluye FotoFrente si Next la envía)' })
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
      'Retorna datos enriquecidos: marca, modelo, tipo vehículo, combustible y cliente. Roles 1-3 buscan globalmente; otros roles filtran por idCliente del token (Next).',
  })
  @ApiParam({ name: 'placa', description: 'Placa del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
  @ApiResponse({ status: 400, description: 'Placa inválida' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
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
