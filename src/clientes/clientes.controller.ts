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
  ApiResponse,
} from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { Request, Response } from 'express';

@ApiTags('Clientes')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2, 3)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Sincronizar clientes desde Next',
    description:
      'Llama a Next API, trae todos los clientes del usuario y los copia a la tabla sombra local.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización completada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async sync(@Req() req: Request) {
    return this.clientesService.syncClientes(req);
  }

  @Get('list')
  @ApiOperation({ summary: 'Lista de clientes (proxy a Next)' })
  @ApiResponse({ status: 200, description: 'Lista obtenida desde Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAllList(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.clientesService.findAllList(req);
    res.status(r.status);
    return r.data;
  }

  @Get('list/:cliente')
  @ApiOperation({ summary: 'Lista de clientes por ID (proxy a Next)' })
  @ApiParam({ name: 'cliente', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Lista obtenida desde Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findAllListById(
    @Param('cliente', ParseIntPipe) clienteId: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.clientesService.findAllListById(clienteId, req);
    res.status(r.status);
    return r.data;
  }

  @Get(':page/:limit')
  @ApiOperation({ summary: 'Lista paginada de clientes (proxy a Next)' })
  @ApiParam({ name: 'page', description: 'Número de página' })
  @ApiParam({ name: 'limit', description: 'Registros por página' })
  @ApiResponse({ status: 200, description: 'Lista paginada desde Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.clientesService.findAll(page, limit, req);
    res.status(r.status);
    return r.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cliente por ID (proxy a Next)' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado en Next' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.clientesService.findOne(id, req);
    res.status(r.status);
    return r.data;
  }
}
