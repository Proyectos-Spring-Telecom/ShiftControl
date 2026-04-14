import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CatGradoSeveridadService } from './cat-grado-severidad.service';
import { CreateCatGradoSeveridadDto } from './dto/create-cat-grado-severidad.dto';
import { UpdateCatGradoSeveridadDto } from './dto/update-cat-grado-severidad.dto';
import { UpdateCatGradoSeveridadEstatusDto } from './dto/update-cat-grado-severidad-estatus.dto';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Cat Grado Severidad')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles()
@Controller('cat-grado-severidad')
export class CatGradoSeveridadController {
  constructor(private readonly service: CatGradoSeveridadService) { }

  @Post()
  @Roles(1)
  @ApiOperation({
    summary: 'Crear grado de severidad',
    description: 'Crea un registro con estatus activo (1). Solo SuperAdministrador.',
  })
  @ApiBody({ type: CreateCatGradoSeveridadDto })
  @ApiResponse({ status: 201, description: 'Creado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async create(
    @Body() dto: CreateCatGradoSeveridadDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return this.service.create(dto, idUser);
  }

  @Get('list')
  @ApiOperation({
    summary: 'Lista de grados de severidad activos',
    description: 'Solo registros con estatus 1',
  })
  @ApiResponse({ status: 200, description: 'Lista obtenida correctamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAllList(): Promise<ApiResponseCommon> {
    return this.service.findAllList();
  }

  @Get(':page/:limit')
  @ApiOperation({
    summary: 'Lista paginada (todos los registros)',
    description: 'Incluye activos e inactivos',
  })
  @ApiParam({ name: 'page', description: 'Número de página', example: 1 })
  @ApiParam({ name: 'limit', description: 'Registros por página', example: 10 })
  @ApiResponse({ status: 200, description: 'Lista paginada obtenida' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
  ): Promise<ApiResponseCommon> {
    return this.service.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener por ID' })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch('estatus/:id')
  @ApiOperation({ summary: 'Cambiar estatus (activar/desactivar)' })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiBody({ type: UpdateCatGradoSeveridadEstatusDto })
  @ApiResponse({ status: 200, description: 'Estatus actualizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async updateEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatGradoSeveridadEstatusDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return this.service.updateEstatus(id, dto, idUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar grado de severidad' })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiBody({ type: UpdateCatGradoSeveridadDto })
  @ApiResponse({ status: 200, description: 'Actualizado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatGradoSeveridadDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return this.service.update(id, dto, idUser);
  }

  @Delete(':id')
  @Roles(1)
  @ApiOperation({
    summary: 'Eliminar (baja lógica)',
    description: 'Alterna estatus activo/inactivo. Solo SuperAdministrador.',
  })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiResponse({ status: 200, description: 'Operación correcta' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idUser = req.user.userId;
    return this.service.remove(id, idUser);
  }
}
