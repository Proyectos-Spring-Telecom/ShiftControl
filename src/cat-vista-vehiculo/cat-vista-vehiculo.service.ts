import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatVistaVehiculo } from 'src/entities/CatVistaVehiculo';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { CreateCatVistaVehiculoDto } from './dto/create-cat-vista-vehiculo.dto';
import { UpdateCatVistaVehiculoDto } from './dto/update-cat-vista-vehiculo.dto';
import { UpdateCatVistaVehiculoEstatusDto } from './dto/update-cat-vista-vehiculo-estatus.dto';

const BITACORA_MODULO_ID = 24;
const BITACORA_TABLA = 'CatVistaVehiculo';

@Injectable()
export class CatVistaVehiculoService {
  constructor(
    @InjectRepository(CatVistaVehiculo)
    private readonly repo: Repository<CatVistaVehiculo>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) {}

  async create(
    dto: CreateCatVistaVehiculoDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const existente = await this.repo.findOne({
        where: { nombre: dto.nombre },
      });
      if (existente) {
        throw new BadRequestException('Ya existe una vista del vehículo con ese nombre');
      }
      const row = this.repo.create({
        nombre: dto.nombre,
        estatus: 1,
      });
      const saved = await this.repo.save(row);

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se creó vista del vehículo: ${dto.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Vista del vehículo creada correctamente',
        data: {
          id: Number(saved.id),
          nombre: saved.nombre,
        },
      };
    } catch (error) {
      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al crear vista del vehículo: ${dto.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      throw new BadRequestException(error);
    }
  }

  async findAllList(): Promise<ApiResponseCommon> {
    try {
      const rows = await this.repo.find({
        where: { estatus: 1 },
        order: { id: 'ASC' },
      });
      const data = rows.map((item) => ({
        ...item,
        id: Number(item.id),
      }));
      return { data };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findAll(page: number, limit: number): Promise<ApiResponseCommon> {
    try {
      const [rows, total] = await this.repo.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: { id: 'ASC' },
      });
      const data = rows.map((item) => ({
        ...item,
        id: Number(item.id),
      }));
      return {
        data,
        paginated: {
          total,
          page,
          lastPage: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        (error as Error).message || 'Error al obtener datos paginados',
      );
    }
  }

  async findOne(id: number) {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException({ message: 'Vista del vehículo no encontrada' });
      }
      return {
        data: {
          ...row,
          id: Number(row.id),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error interno:', error);
      throw new HttpException(
        {
          message: 'Error interno al buscar la vista del vehículo',
          details: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    dto: UpdateCatVistaVehiculoDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Vista del vehículo no encontrada');
      await this.repo.update(id, { nombre: dto.nombre });
      const updated = await this.repo.findOne({ where: { id } });

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó vista del vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Vista del vehículo actualizada correctamente',
        data: {
          id,
          nombre: updated?.nombre ?? dto.nombre,
        },
      };
    } catch (error) {
      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al actualizar vista del vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      throw new BadRequestException(error);
    }
  }

  async updateEstatus(
    id: number,
    dto: UpdateCatVistaVehiculoEstatusDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException('Vista del vehículo no encontrada');
      }
      const estatus = dto.estatus;
      await this.repo.update(id, { estatus });

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó vista del vehículo ID: ${id} a estatus: ${estatus}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus actualizado correctamente',
        estatus: { estatus },
        data: {
          id,
          nombre: row.nombre,
        },
      };
    } catch (error) {
      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al cambiar estatus vista vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al cambiar estatus del registro con id: ${id}`,
      );
    }
  }

  async remove(id: number, idUser: number): Promise<ApiCrudResponse> {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Vista del vehículo no encontrada');

      const nextEstatus = row.estatus === 1 ? 0 : 1;
      await this.repo.update(id, { estatus: nextEstatus });

      const querylogger = { id, estatus: nextEstatus };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Baja lógica vista vehículo ID: ${id} → estatus ${nextEstatus}`,
        'UPDATE',
        querylogger,
        Number(idUser),
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message:
          nextEstatus === 0
            ? 'Vista del vehículo desactivada correctamente'
            : 'Vista del vehículo activada correctamente',
        data: {
          id,
          nombre: row.nombre,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const querylogger = { id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error en baja lógica vista vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        Number(idUser),
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      throw new InternalServerErrorException({
        message: 'Error al aplicar baja lógica a la vista del vehículo.',
        error: (error as Error).message,
      });
    }
  }
}
