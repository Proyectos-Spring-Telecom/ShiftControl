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
import { CatPartesVehiculoEx } from 'src/entities/CatPartesVehiculoEx';
import { CatVistaVehiculo } from 'src/entities/CatVistaVehiculo';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { CreateCatPartesVehiculoExDto } from './dto/create-cat-partes-vehiculo-ex.dto';
import { UpdateCatPartesVehiculoExDto } from './dto/update-cat-partes-vehiculo-ex.dto';
import { UpdateCatPartesVehiculoExEstatusDto } from './dto/update-cat-partes-vehiculo-ex-estatus.dto';

const BITACORA_MODULO_ID = 15;
const BITACORA_TABLA = 'CatPartesVehiculoEx';

@Injectable()
export class CatPartesVehiculoExService {
  constructor(
    @InjectRepository(CatPartesVehiculoEx)
    private readonly repo: Repository<CatPartesVehiculoEx>,
    @InjectRepository(CatVistaVehiculo)
    private readonly vistaVehiculoRepo: Repository<CatVistaVehiculo>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) { }

  private mapRow(item: CatPartesVehiculoEx) {
    const vista = item.vistaVehiculo;
    return {
      id: Number(item.id),
      nombre: item.nombre,
      estatus: item.estatus,
      fechaCreacion: item.fechaCreacion,
      fechaActualizacion: item.fechaActualizacion,
      idVistaVehiculo: Number(item.idVistaVehiculo),
      vistaVehiculo: vista
        ? { id: Number(vista.id), nombre: vista.nombre }
        : null,
    };
  }

  private async resolveIdVistaVehiculo(idVistaVehiculo: number): Promise<number> {
    const vista = await this.vistaVehiculoRepo.findOne({
      where: { id: idVistaVehiculo, estatus: 1 },
    });
    if (!vista) {
      throw new BadRequestException(
        'La vista del vehículo indicada no existe o está inactiva',
      );
    }
    return idVistaVehiculo;
  }

  async create(
    dto: CreateCatPartesVehiculoExDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const existente = await this.repo.findOne({
        where: { nombre: dto.nombre, idVistaVehiculo: dto.idVistaVehiculo },
      });
      if (existente) {
        throw new BadRequestException('Ya existe una parte del vehículo con ese nombre');
      }
      const idVistaVehiculo = await this.resolveIdVistaVehiculo(dto.idVistaVehiculo);
      const row = this.repo.create({
        nombre: dto.nombre,
        estatus: 1,
        idVistaVehiculo,
      });
      const saved = await this.repo.save(row);
      const withVista = await this.repo.findOne({
        where: { id: saved.id },
        relations: ['vistaVehiculo'],
      });

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se creó parte del vehículo: ${dto.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Parte del vehículo creada correctamente',
        data: withVista
          ? this.mapRow(withVista)
          : {
            id: Number(saved.id),
            nombre: saved.nombre,
            idVistaVehiculo,
            vistaVehiculo: null,
          },
      };
    } catch (error) {
      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al crear parte del vehículo: ${dto.nombre}`,
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
        relations: ['vistaVehiculo'],
        order: { id: 'ASC' },
      });
      const data = rows.map((item) => this.mapRow(item));
      return { data };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findActiveByIdVistaVehiculo(
    idVistaVehiculo: number,
  ): Promise<ApiResponseCommon> {
    try {
      const rows = await this.repo.find({
        where: { idVistaVehiculo, estatus: 1 },
        relations: ['vistaVehiculo'],
        order: { id: 'ASC' },
      });
      const data = rows.map((item) => this.mapRow(item));
      return { data };
    } catch (error) {
      throw new BadRequestException(
        (error as Error).message ||
        'Error al obtener partes del vehículo por vista',
      );
    }
  }

  async findAll(page: number, limit: number): Promise<ApiResponseCommon> {
    try {
      const [rows, total] = await this.repo.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        relations: ['vistaVehiculo'],
        order: { id: 'ASC' },
      });
      const data = rows.map((item) => this.mapRow(item));
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
      const row = await this.repo.findOne({
        where: { id },
        relations: ['vistaVehiculo'],
      });
      if (!row) {
        throw new NotFoundException({ message: 'Parte del vehículo no encontrada' });
      }
      return {
        data: this.mapRow(row),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error interno:', error);
      throw new HttpException(
        {
          message: 'Error interno al buscar la parte del vehículo',
          details: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    dto: UpdateCatPartesVehiculoExDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Parte del vehículo no encontrada');

      const idVistaVehiculo = await this.resolveIdVistaVehiculo(
        dto.idVistaVehiculo,
      );

      await this.repo.update(id, {
        nombre: dto.nombre,
        idVistaVehiculo,
      });
      const updated = await this.repo.findOne({
        where: { id },
        relations: ['vistaVehiculo'],
      });

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó parte del vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Parte del vehículo actualizada correctamente',
        data: updated
          ? this.mapRow(updated)
          : {
            id,
            nombre: dto.nombre,
            idVistaVehiculo,
            vistaVehiculo: null,
          },
      };
    } catch (error) {
      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al actualizar parte del vehículo ID: ${id}`,
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
    dto: UpdateCatPartesVehiculoExEstatusDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const row = await this.repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException('Parte del vehículo no encontrada');
      }
      const estatus = dto.estatus;
      await this.repo.update(id, { estatus });

      const querylogger = { dto };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó parte del vehículo ID: ${id} a estatus: ${estatus}`,
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
        `Error al cambiar estatus parte vehículo ID: ${id}`,
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
      if (!row) throw new NotFoundException('Parte del vehículo no encontrada');

      const nextEstatus = row.estatus === 1 ? 0 : 1;
      await this.repo.update(id, { estatus: nextEstatus });

      const querylogger = { id, estatus: nextEstatus };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Baja lógica parte vehículo ID: ${id} → estatus ${nextEstatus}`,
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
            ? 'Parte del vehículo desactivada correctamente'
            : 'Parte del vehículo activada correctamente',
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
        `Error en baja lógica parte vehículo ID: ${id}`,
        'UPDATE',
        querylogger,
        Number(idUser),
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      throw new InternalServerErrorException({
        message: 'Error al aplicar baja lógica a la parte del vehículo.',
        error: (error as Error).message,
      });
    }
  }
}
