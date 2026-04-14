import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turnos } from 'src/entities/Turnos';
import { Vehiculos } from 'src/entities/Vehiculos';
import { CatEstatusTurno } from 'src/entities/CatEstatusTurno';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { UpdateTurnoEstatusDto } from './dto/update-turno-estatus.dto';
import { EnumEstatusTurno, EstatusEnum } from 'src/common/estatus.enum';

const BITACORA_MODULO_ID = 25;
const BITACORA_TABLA = 'Turnos';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turnos)
    private readonly repository: Repository<Turnos>,
    @InjectRepository(Vehiculos)
    private readonly vehiculosRepository: Repository<Vehiculos>,
    @InjectRepository(CatEstatusTurno)
    private readonly catEstatusTurnoRepository: Repository<CatEstatusTurno>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) {}

  private mapTurnoRow(t: Turnos) {
    return {
      ...t,
      id: Number(t.id),
      idVehiculo: t.idVehiculo != null ? Number(t.idVehiculo) : null,
      idCliente: t.idCliente != null ? Number(t.idCliente) : null,
      idUsuario: t.idUsuario != null ? Number(t.idUsuario) : null,
      idBitacoraApertura:
        t.idBitacoraApertura != null ? Number(t.idBitacoraApertura) : null,
      evidenciaApertura: t.evidenciaApertura != null ? Number(t.evidenciaApertura) : null,
      idBitacoraCierre: t.idBitacoraCierre != null ? Number(t.idBitacoraCierre) : null,
      evidenciaCierre: t.evidenciaCierre != null ? Number(t.evidenciaCierre) : null,
      idEstatusTurno: t.idEstatusTurno != null ? Number(t.idEstatusTurno) : null,
      vehiculo: t.vehiculo
        ? {
            ...t.vehiculo,
            id: Number(t.vehiculo.id),
            idCliente: Number(t.vehiculo.idCliente),
          }
        : t.vehiculo,
      estatusTurno: t.estatusTurno
        ? { ...t.estatusTurno, id: Number(t.estatusTurno.id) }
        : t.estatusTurno,
    };
  }

  async create(
    dto: CreateTurnoDto,
    idCliente: number,
    idUsuario: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const placaNorm = dto.placa.trim();
      const vehiculo = await this.vehiculosRepository.findOne({
        where: { placas: placaNorm },
      });
      if (!vehiculo) {
        throw new BadRequestException(
          'Vehículo no encontrado. Ejecute POST /api/vehiculos/sync primero',
        );
      }

      const idVehiculo = vehiculo.id;
      const turnoActivo = await this.repository.findOne({
        where: {
          idVehiculo,
          estatus: EnumEstatusTurno.PROGRAMADO,
        },
      });
      if (turnoActivo && turnoActivo.idEstatusTurno === EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('Este vehículo ya tiene un turno activo');
      }

      if (dto.idEstatusTurno && dto.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        const estatusTurno = await this.catEstatusTurnoRepository.findOne({
          where: { id: dto.idEstatusTurno },
        });
        if (!estatusTurno) {
          throw new BadRequestException('IDEstatusTurno no existe');
        }
      }

      const entity = this.repository.create({
        idVehiculo,
        idCliente: vehiculo.idCliente,
        idUsuario,
        latitudApertura: dto.latitud ?? null,
        longitudApertura: dto.longitud ?? null,
        idEstatusTurno: dto.idEstatusTurno ?? EnumEstatusTurno.EN_CURSO,
        fechaApertura: new Date(Date.now()),
        estatus: EstatusEnum.ACTIVO,
      });

      const saved = await this.repository.save(entity);

      const querylogger = { dto, idCliente, idUsuario };

      /* await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se creó turno Id ${saved.id} vehículo ${vehiculo.placas}`,
        'CREATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );
 */
      return {
        status: 'success',
        message: 'Turno creado correctamente',
        data: {
          id: Number(saved.id),
          nombre: `Turno #${saved.id} - ${vehiculo.placas}`,
        },
      };
    } catch (error) {
      const querylogger = { dto, idCliente, idUsuario };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        'Error al crear turno',
        'CREATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async findAllList(idCliente: number): Promise<ApiResponseCommon> {
    try {
      const rows = await this.repository.find({
        where: { idCliente, estatus: 1 },
        order: { fechaApertura: 'DESC' },
        relations: ['vehiculo', 'estatusTurno'],
      });
      const data = rows.map((item) => this.mapTurnoRow(item));
      return { data };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async findAll(
    idCliente: number,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    try {
      const [rows, total] = await this.repository.findAndCount({
        where: { idCliente },
        relations: ['vehiculo', 'estatusTurno'],
        order: { fechaApertura: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const data = rows.map((item) => this.mapTurnoRow(item));
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
        (error as Error).message || 'Error al obtener turnos',
      );
    }
  }

  async findOne(id: number, idCliente: number) {
    try {
      const turno = await this.repository.findOne({
        where: { id, idCliente },
        relations: ['vehiculo', 'estatusTurno'],
      });
      if (!turno) {
        throw new NotFoundException({ message: 'Turno no encontrado' });
      }
      return { data: this.mapTurnoRow(turno) };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error interno al buscar el turno',
        details: (error as Error).message,
      });
    }
  }

  async update(
    id: number,
    dto: UpdateTurnoDto,
    idCliente: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const turno = await this.repository.findOne({
        where: { id, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }

      const updateData: Partial<Turnos> = {};
      if (dto.idEstatusTurno !== undefined) {
        const cat = await this.catEstatusTurnoRepository.findOne({
          where: { id: dto.idEstatusTurno },
        });
        if (!cat) {
          throw new BadRequestException('IDEstatusTurno no existe');
        }
        updateData.idEstatusTurno = dto.idEstatusTurno;
      }
      if (dto.fechaCierre !== undefined) {
        updateData.fechaCierre = new Date(dto.fechaCierre);
      }
      if (dto.duracion !== undefined) {
        updateData.duracion = dto.duracion;
      }
      if (dto.latitudApertura !== undefined) {
        updateData.latitudApertura = dto.latitudApertura;
      }
      if (dto.longitudApertura !== undefined) {
        updateData.longitudApertura = dto.longitudApertura;
      }
      if (dto.latitudCierre !== undefined) {
        updateData.latitudCierre = dto.latitudCierre;
      }
      if (dto.longitudCierre !== undefined) {
        updateData.longitudCierre = dto.longitudCierre;
      }
      if (dto.idBitacoraApertura !== undefined) {
        updateData.idBitacoraApertura = dto.idBitacoraApertura;
      }
      if (dto.evidenciaApertura !== undefined) {
        updateData.evidenciaApertura = dto.evidenciaApertura;
      }
      if (dto.idBitacoraCierre !== undefined) {
        updateData.idBitacoraCierre = dto.idBitacoraCierre;
      }
      if (dto.evidenciaCierre !== undefined) {
        updateData.evidenciaCierre = dto.evidenciaCierre;
      }

      if (Object.keys(updateData).length > 0) {
        await this.repository.update(id, updateData);
      }

      const turnoResult = await this.repository.findOne({
        where: { id, idCliente },
        relations: ['vehiculo'],
      });
      const placas = turnoResult?.vehiculo?.placas ?? '';

      const querylogger = { dto, id, idCliente };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó turno Id ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Turno actualizado correctamente',
        data: {
          id,
          nombre: `Turno #${id} - ${placas}`,
        },
      };
    } catch (error) {
      const querylogger = { dto, id, idCliente };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al actualizar turno Id ${id}`,
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
      throw new BadRequestException((error as Error).message);
    }
  }

  async updateEstatus(
    id: number,
    dto: UpdateTurnoEstatusDto,
    idCliente: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const turno = await this.repository.findOne({
        where: { id, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }
      const estatus = dto.estatus;
      await this.repository.update(id, { estatus });

      const querylogger = { dto, id, idCliente };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Se actualizó estatus del turno Id ${id} a ${estatus}`,
        'UPDATE',
        querylogger,
        idUser,
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus del turno actualizado correctamente',
        estatus: { estatus },
        data: {
          id,
          nombre: `Turno #${id} - ${turno.vehiculo?.placas ?? ''}`,
        },
      };
    } catch (error) {
      const querylogger = { dto, id, idCliente };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al cambiar estatus turno Id ${id}`,
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
        `Error al cambiar estatus del turno con id: ${id}`,
      );
    }
  }

  async remove(id: number, idCliente: number, idUser: number): Promise<ApiCrudResponse> {
    try {
      const turno = await this.repository.findOne({
        where: { id, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }
      const nuevo = turno.estatus === 1 ? 0 : 1;
      await this.repository.update(id, { estatus: nuevo });

      const querylogger = { id, idCliente, estatus: nuevo };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Baja lógica turno Id ${id} estatus ${nuevo}`,
        'UPDATE',
        querylogger,
        Number(idUser),
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Turno eliminado correctamente',
        data: {
          id,
          nombre: `Turno #${id} - ${turno.vehiculo?.placas ?? ''}`,
        },
      };
    } catch (error) {
      const querylogger = { id, idCliente };
      await this.bitacoraLogger.logToBitacora(
        BITACORA_TABLA,
        `Error al eliminar turno Id ${id}`,
        'UPDATE',
        querylogger,
        Number(idUser),
        BITACORA_MODULO_ID,
        EstatusEnumBitcora.ERROR,
        (error as Error).message,
      );
      throw new InternalServerErrorException({
        message: 'Error al eliminar turno.',
        error: (error as Error).message,
      });
    }
  }
}
