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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TurnosService } from "./turnos.service";
import { CreateTurnoDto } from "./dto/create-turno.dto";
import { UpdateTurnoDto } from "./dto/update-turno.dto";
import { UpdateTurnoEstatusDto } from "./dto/update-turno-estatus.dto";
import { ApiCrudResponse, ApiResponseCommon } from "src/common/ApiResponse";
import { JwtAuthGuard } from "src/guard/jwt-auth.guard";
import { RolesGuard } from "src/guard/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@ApiTags("Turnos")
@ApiBearerAuth("bearer-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2, 3)
@Controller("turnos")
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @ApiOperation({ summary: "Crear turno (abrir turno)" })
  @ApiBody({ type: CreateTurnoDto })
  @ApiResponse({ status: 201, description: "Turno creado" })
  @ApiResponse({
    status: 400,
    description:
      "Placa no encontrada en tabla sombra o el vehículo ya tiene turno activo",
  })
  async create(
    @Body() dto: CreateTurnoDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUsuario = req.user.userId;
    const idUser = req.user.userId;
    return this.turnosService.create(dto, idCliente, idUsuario, idUser);
  }

  @Get("list")
  @ApiOperation({ summary: "Lista de turnos activos del cliente" })
  async findAllList(@Request() req): Promise<ApiResponseCommon> {
    const idCliente = req.user.idCliente;
    return this.turnosService.findAllList(idCliente);
  }

  @Get(":page/:limit")
  @ApiOperation({ summary: "Lista paginada de turnos (todos)" })
  @ApiParam({ name: "page" })
  @ApiParam({ name: "limit" })
  async findAll(
    @Param("page", ParseIntPipe) page: number,
    @Param("limit", ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const idCliente = Number(req.user.idCliente);
    return this.turnosService.findAll(idCliente, page, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener turno por ID" })
  @ApiParam({ name: "id" })
  async findOne(@Param("id", ParseIntPipe) id: number, @Request() req) {
    const idCliente = req.user.idCliente;
    return this.turnosService.findOne(id, idCliente);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar turno" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateTurnoDto })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTurnoDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.update(id, dto, idCliente, idUser);
  }

  @Patch(":id/estatus")
  @ApiOperation({ summary: "Cambiar estatus del turno (activar/desactivar)" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateTurnoEstatusDto })
  async updateEstatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTurnoEstatusDto,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.updateEstatus(id, dto, idCliente, idUser);
  }

  @Delete(":id")
  @Roles(1)
  @ApiOperation({ summary: "Eliminar turno (baja lógica)" })
  @ApiParam({ name: "id" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ApiCrudResponse> {
    const idCliente = req.user.idCliente;
    const idUser = req.user.userId;
    return this.turnosService.remove(id, idCliente, idUser);
  }
}
