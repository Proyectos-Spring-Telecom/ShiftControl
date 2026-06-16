import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Turnos } from 'src/entities/Turnos';
import { Vehiculos } from 'src/entities/Vehiculos';
import { CatEstatusTurno } from 'src/entities/CatEstatusTurno';
import { BitacoraVehiculo } from 'src/entities/BitacoraVehiculo';
import { Tablero } from 'src/entities/Tablero';
import { TestigosVehiculo } from 'src/entities/TestigosVehiculo';
import { NivelesFluidos } from 'src/entities/NivelesFluidos';
import { LucesVehiculo } from 'src/entities/LucesVehiculo';
import { DocumentacionVehiculo } from 'src/entities/DocumentacionVehiculo';
import { AccesoriosVehiculo } from 'src/entities/AccesoriosVehiculo';
import { InspeccionVehiculoEx } from 'src/entities/InspeccionVehiculoEx';
import { IncidenciaAccidente } from 'src/entities/IncidenciaAccidente';
import { CatTipoIncidente } from 'src/entities/CatTipoIncidente';
import { IncidenciaGasolina } from 'src/entities/IncidenciaGasolina';
import { ApiCrudResponse, ApiResponseCommon } from 'src/common/ApiResponse';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { RegistrarTableroBitacoraDto } from './dto/registrar-tablero-bitacora.dto';
import { RegistrarTestigosBitacoraDto } from './dto/registrar-testigos-bitacora.dto';
import { RegistrarNivelesFluidosBitacoraDto } from './dto/registrar-niveles-fluidos-bitacora.dto';
import { RegistrarLucesBitacoraDto } from './dto/registrar-luces-bitacora.dto';
import { RegistrarDocumentacionBitacoraDto } from './dto/registrar-documentacion-bitacora.dto';
import { RegistrarAccesoriosBitacoraDto } from './dto/registrar-accesorios-bitacora.dto';
import { RegistrarInspeccionVehiculoExBitacoraDto } from './dto/registrar-inspeccion-vehiculo-ex-bitacora.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { CierreBitacoraVehiculoDto } from './dto/cierre-bitacora-vehiculo.dto';
import { CrearIncidenciaAccidenteDto } from './dto/crear-incidencia-accidente.dto';
import { CrearIncidenciaGasolinaDto } from './dto/crear-incidencia-gasolina.dto';
import {
  MiTurnoActivoResponseDto,
  MiTurnoUltimoTurnoDto,
  MiTurnoUltimaIncidenciaAccidenteDto,
  MiTurnoUltimaIncidenciaGasolinaDto,
} from './dto/mi-turno-activo.response';
import {
  EnumEstatusTurno,
  EstatusEnum,
  EnumModulos,
  EnumTipoBitacoraVehiculo,
} from 'src/common/estatus.enum';
import { S3Service } from 'src/s3/s3.service';
import { VehiculosService } from 'src/vehiculos/vehiculos.service';
import { EndpointProxyService } from 'src/integration/endpoint-proxy.service';
import { TenantFilterService } from 'src/common/tenant-filter/tenant-filter.service';
import { msToMysqlTime, normalizeMysqlTime } from 'src/common/mysql-time.util';
import { loadTurnoDetalleSql } from './turnos-find-one-raw';
import { buildDetalleTurnoView } from './turno-detalle-view.builder';
import type { Request } from 'express';

const UMBRAL_NIVEL_FLUIDO_BAJO = 25;

function valoresFluidosDefinidos(dto: RegistrarNivelesFluidosBitacoraDto): number[] {
  const keys = [
    'gasolina',
    'aceite',
    'bateria',
    'anticongelante',
    'liquidoFrenos',
  ] as const;
  const out: number[] = [];
  for (const k of keys) {
    const v = dto[k];
    if (v !== undefined && v !== null) {
      out.push(v);
    }
  }
  return out;
}

/** Campos de indicadores del DTO (excluye ids y bitácora) para regla de estatus de fila */
function valoresIndicadoresTestigos(dto: RegistrarTestigosBitacoraDto): EstatusEnum[] {
  const keys = [
    'abs',
    'potencia',
    'cinturonSeguridad',
    'luces',
    'presionAceite',
    'bateria',
    'checkEngine',
    'airbag',
    'presionNeumatico',
    'sistemaFrenos',
    'temperaturaMotor',
    'fallaDireccionAsistida',
  ] as const;
  const out: EstatusEnum[] = [];
  for (const k of keys) {
    out.push(dto[k] ?? EstatusEnum.INACTIVO);
  }
  return out;
}

function valoresLucesDefinidos(dto: RegistrarLucesBitacoraDto): EstatusEnum[] {
  const keys = [
    'altas',
    'cortas',
    'intermitentesDelanteras',
    'direccionalesDelanteras',
    'intermitentesLaterales',
    'intermitentesTraseras',
    'direccionalesTraseras',
    'reversa',
    'freno',
  ] as const;
  const out: EstatusEnum[] = [];
  for (const k of keys) {
    const v = dto[k];
    if (v !== undefined && v !== null) {
      out.push(v);
    }
  }
  return out;
}

function valoresDocumentacionDefinidos(
  dto: RegistrarDocumentacionBitacoraDto,
): EstatusEnum[] {
  const keys = [
    'bitacoraVehicular',
    'certificadoEcologico',
    'polizaSeguro',
    'tarjetaCirculacion',
    'verificacion',
  ] as const;
  const out: EstatusEnum[] = [];
  for (const k of keys) {
    const v = dto[k];
    if (v !== undefined && v !== null) {
      out.push(v);
    }
  }
  return out;
}

function valoresAccesoriosDefinidos(dto: RegistrarAccesoriosBitacoraDto): EstatusEnum[] {
  const keys = [
    'limpiaparabrisas',
    'aguas',
    'extintor',
    'tringulosSeguridad',
    'stereo',
    'tapetes',
    'herramienta',
    'refaccion',
    'impermeable',
  ] as const;
  const out: EstatusEnum[] = [];
  for (const k of keys) {
    const v = dto[k];
    if (v !== undefined && v !== null) {
      out.push(v);
    }
  }
  return out;
}

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turnos)
    private readonly repository: Repository<Turnos>,
    @InjectRepository(Vehiculos)
    private readonly vehiculosRepository: Repository<Vehiculos>,
    @InjectRepository(CatEstatusTurno)
    private readonly catEstatusTurnoRepository: Repository<CatEstatusTurno>,
    @InjectRepository(BitacoraVehiculo)
    private readonly bitacoraRepository: Repository<BitacoraVehiculo>,
    @InjectRepository(IncidenciaAccidente)
    private readonly incidenciaAccidenteRepository: Repository<IncidenciaAccidente>,
    @InjectRepository(CatTipoIncidente)
    private readonly catTipoIncidenteRepository: Repository<CatTipoIncidente>,
    @InjectRepository(IncidenciaGasolina)
    private readonly incidenciaGasolinaRepository: Repository<IncidenciaGasolina>,
    private readonly s3Service: S3Service,
    private readonly vehiculosService: VehiculosService,
    private readonly endpointProxy: EndpointProxyService,
    private readonly tenantFilter: TenantFilterService,
  ) { }

  private normalizePlacaKey(value: string): string {
    return value.toUpperCase().replace(/[-\s]/g, '');
  }

  /** Mapea fila de query SQL a un objeto plano (mismas columnas/alias del SELECT, sin objetos anidados). */
  private mapTurnoQueryRow(row: Record<string, unknown>) {
    const num = (v: unknown): number | null =>
      v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
    return {
      id: Number(row.id),
      idVehiculo: num(row.idVehiculo),
      idCliente: num(row.idCliente),
      idUsuario: num(row.idUsuario),
      idBitacoraApertura: num(row.idBitacoraApertura),
      evidenciaApertura: (row.evidenciaApertura as string | null) ?? null,
      longitudApertura: num(row.longitudApertura),
      latitudApertura: num(row.latitudApertura),
      fechaApertura: (row.fechaApertura as Date | null) ?? null,
      idBitacoraCierre: num(row.idBitacoraCierre),
      evidenciaCierre: (row.evidenciaCierre as string | null) ?? null,
      longitudCierre: num(row.longitudCierre),
      latitudCierre: num(row.latitudCierre),
      fechaCierre: (row.fechaCierre as Date | null) ?? null,
      duracion: normalizeMysqlTime(row.duracion),
      estatus: num(row.estatus),
      idEstatusTurno: num(row.idEstatusTurno),
      fechaCreacion: (row.fechaCreacion as Date | null) ?? null,
      fechaActualizacion: (row.fechaActualizacion as Date | null) ?? null,
      placas: (row.placas as string | null) ?? null,
      fotoFrente: (row.fotoFrente as string | null) ?? null,
      marca: (row.marca as string | null) ?? null,
      modelo: (row.modelo as string | null) ?? null,
      vehiculoId: num(row.vehiculoId),
      vehiculoIdCliente: num(row.vehiculoIdCliente),
      estatusTurnoId: num(row.etId),
      estatusTurnoNombre: (row.etNombre as string | null) ?? null,
    };
  }

  /** Misma forma plana que `mapTurnoQueryRow`, a partir de entidad + relaciones cargadas. */
  private mapTurnoEntityToFlat(t: Turnos) {
    const num = (v: unknown): number | null =>
      v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
    const v = t.vehiculo;
    const et = t.estatusTurno;
    return {
      id: Number(t.id),
      idVehiculo: num(t.idVehiculo),
      idCliente: num(t.idCliente),
      idUsuario: num(t.idUsuario),
      idBitacoraApertura: num(t.idBitacoraApertura),
      evidenciaApertura: t.evidenciaApertura ?? null,
      longitudApertura: num(t.longitudApertura),
      latitudApertura: num(t.latitudApertura),
      fechaApertura: t.fechaApertura ?? null,
      idBitacoraCierre: num(t.idBitacoraCierre),
      evidenciaCierre: t.evidenciaCierre ?? null,
      longitudCierre: num(t.longitudCierre),
      latitudCierre: num(t.latitudCierre),
      fechaCierre: t.fechaCierre ?? null,
      duracion: normalizeMysqlTime(t.duracion),
      estatus: num(t.estatus),
      idEstatusTurno: num(t.idEstatusTurno),
      fechaCreacion: t.fechaCreacion ?? null,
      fechaActualizacion: t.fechaActualizacion ?? null,
      placas: v?.placas ?? null,
      fotoFrente: v?.fotoFrente ?? null,
      vehiculoId: v != null ? Number(v.id) : null,
      vehiculoIdCliente: v != null ? Number(v.idCliente) : null,
      estatusTurnoId: et != null ? Number(et.id) : null,
      estatusTurnoNombre: et?.nombre ?? null,
    };
  }

  /**
   * Sube un archivo a S3 si se envió. Retorna la URL o null.
   */
  private async procesarArchivo(
    file: Express.Multer.File | undefined,
    folder: string,
    idUser: number,
    idModule: number,
  ): Promise<string | null> {
    if (!file) return null;
    const { url } = await this.s3Service.uploadFile(file, folder, idUser, idModule);
    return url;
  }

  async create(
    dto: CreateTurnoDto,
    idCliente: number,
    idUsuario: number,
    idUser: number,
    evidenciaAperturaFile: Express.Multer.File | undefined,
    req: Request,
  ): Promise<ApiCrudResponse> {
    try {
      if (!evidenciaAperturaFile?.buffer?.length) {
        throw new BadRequestException(
          'Debe adjuntar la imagen evidenciaApertura',
        );
      }

      const placaNorm = this.normalizePlacaKey(dto.placa.trim());
      if (!placaNorm) {
        throw new BadRequestException('Placa inválida');
      }

      const vehiculo = await this.vehiculosRepository
        .createQueryBuilder('v')
        .where(`REPLACE(REPLACE(UPPER(TRIM(v.placas)), '-', ''), ' ', '') = :norm`, {
          norm: placaNorm,
        })
        .andWhere('v.idCliente = :idCliente', { idCliente })
        .getOne();

      if (!vehiculo) {
        throw new BadRequestException(
          `Vehículo con placa "${dto.placa.trim()}" no encontrado en tabla sombra. Ejecute POST /api/vehiculos/sync primero`,
        );
      }

      const idVehiculo = vehiculo.id;
      const turnoActivo = await this.repository.findOne({
        where: {
          idVehiculo,
          idCliente: vehiculo.idCliente,
          estatus: EstatusEnum.ACTIVO,
          idEstatusTurno: In([EnumEstatusTurno.EN_CURSO]),
        },
      });
      if (turnoActivo) {
        throw new BadRequestException('Este vehículo ya tiene un turno activo');
      }

      const urlArchivo = await this.procesarArchivo(
        evidenciaAperturaFile,
        'Turnos',
        idUser,
        EnumModulos.TURNOS,
      );

      const evidenciaUrl = urlArchivo ?? (dto.evidenciaAperturaUrl?.trim() || null);
      if (!evidenciaUrl) {
        throw new BadRequestException(
          'No se pudo obtener URL de evidencia (subida S3 o evidenciaAperturaUrl)',
        );
      }
      if (evidenciaUrl.length > 500) {
        throw new BadRequestException(
          'La URL de evidencia supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      const { saved, idBitacoraApertura } = await this.repository.manager.transaction(
        async (manager) => {
          const turnoRepo = manager.getRepository(Turnos);
          const bitacoraRepo = manager.getRepository(BitacoraVehiculo);

          const turno = turnoRepo.create({
            idVehiculo,
            idCliente,
            idUsuario,
            latitudApertura: dto.latitud ?? null,
            longitudApertura: dto.longitud ?? null,
            evidenciaApertura: evidenciaUrl,
            idEstatusTurno: EnumEstatusTurno.EN_CURSO,
            fechaApertura: new Date(Date.now()),
            estatus: EstatusEnum.ACTIVO,
            idBitacoraApertura: null,
          });
          const savedTurno = await turnoRepo.save(turno);

          const bitacora = bitacoraRepo.create({
            idVehiculo,
            idCliente: vehiculo.idCliente,
            idTurno: savedTurno.id,
            tipo: EnumTipoBitacoraVehiculo.APERTURA,
            estatus: EstatusEnum.ACTIVO,
          });
          const savedBitacora = await bitacoraRepo.save(bitacora);

          await turnoRepo.update(savedTurno.id, {
            idBitacoraApertura: savedBitacora.id,
          });

          return {
            saved: savedTurno,
            idBitacoraApertura: Number(savedBitacora.id),
          };
        },
      );

      const placaParaNext = vehiculo.placas?.trim() ?? '';
      const vehiculoPorPlaca = placaParaNext
        ? await this.vehiculosService.findOneByPlaca(placaParaNext, req)
        : { status: 404, data: null };

      return {
        status: 'success',
        message: 'Turno creado correctamente',
        data: {
          id: Number(saved.id),
          nombre: `Turno #${saved.id} - ${vehiculo.placas}`,
          idTurno: Number(saved.id),
          idBitacoraApertura,
          vehiculoPorPlaca,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async crearIncidenciaAccidente(
    dto: CrearIncidenciaAccidenteDto,
    idCliente: number,
    idUser: number,
    files: {
      fotoEvidencia1?: Express.Multer.File[];
      fotoEvidencia2?: Express.Multer.File[];
      fotoEvidencia3?: Express.Multer.File[];
    },
  ): Promise<ApiCrudResponse> {
    try {
      const foto1 = files.fotoEvidencia1?.[0];
      if (!foto1?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen fotoEvidencia1');
      }

      const turno = await this.repository.findOne({
        where: { id: dto.idTurno, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException({ message: 'Turno no encontrado' });
      }
      if (turno.idVehiculo == null) {
        throw new BadRequestException('El turno no tiene vehículo asociado');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const idCatTipoIncidente = dto.idCatTipoIncidente ?? 1;

      const tipoIncidente = await this.catTipoIncidenteRepository.findOne({
        where: { id: idCatTipoIncidente, estatus: EstatusEnum.ACTIVO },
      });
      if (!tipoIncidente) {
        throw new BadRequestException(
          'Tipo de incidente inválido o inactivo. Envíe idCatTipoIncidente válido o configure el catálogo con id 1 activo.',
        );
      }

      const url1 = await this.procesarArchivo(
        foto1,
        'turnos/incidencias',
        idUser,
        EnumModulos.TURNOS,
      );
      if (!url1) {
        throw new BadRequestException('No se pudo subir fotoEvidencia1');
      }
      if (url1.length > 500) {
        throw new BadRequestException(
          'La URL de fotoEvidencia1 supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      let fotoEvidencia2: string | null = null;
      const foto2 = files.fotoEvidencia2?.[0];
      if (foto2?.buffer?.length) {
        const u2 = await this.procesarArchivo(
          foto2,
          'turnos/incidencias',
          idUser,
          EnumModulos.TURNOS,
        );
        if (u2 && u2.length > 500) {
          throw new BadRequestException(
            'La URL de fotoEvidencia2 supera 500 caracteres (límite de columna en base de datos)',
          );
        }
        fotoEvidencia2 = u2;
      }

      let fotoEvidencia3: string | null = null;
      const foto3 = files.fotoEvidencia3?.[0];
      if (foto3?.buffer?.length) {
        const u3 = await this.procesarArchivo(
          foto3,
          'turnos/incidencias/accidente',
          idUser,
          EnumModulos.TURNOS,
        );
        if (u3 && u3.length > 500) {
          throw new BadRequestException(
            'La URL de fotoEvidencia3 supera 500 caracteres (límite de columna en base de datos)',
          );
        }
        fotoEvidencia3 = u3;
      }

      const insertResult = await this.incidenciaAccidenteRepository.insert({
        idTurno: turno.id,
        idCliente,
        idVehiculo: turno.idVehiculo,
        idCatTipoIncidente,
        descripcion: dto.descripcion.trim(),
        fotoEvidencia1: url1,
        fotoEvidencia2,
        fotoEvidencia3,
        latitud: dto.latitud,
        longitud: dto.longitud,
        estatus: EstatusEnum.ACTIVO,
      });
      const idNuevo = Number(insertResult.identifiers[0].id);
      const placas = turno.vehiculo?.placas?.trim() ?? '';

      return {
        status: 'success',
        message: 'Incidencia de accidente registrada correctamente',
        data: {
          id: idNuevo,
          idTurno: Number(turno.id),
          idVehiculo: Number(turno.idVehiculo),
          nombre: placas
            ? `Incidencia #${idNuevo} — Turno #${turno.id} — ${placas}`
            : `Incidencia #${idNuevo} — Turno #${turno.id}`,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async crearIncidenciaGasolina(
    dto: CrearIncidenciaGasolinaDto,
    idCliente: number,
    idUser: number,
    files: {
      fotoTableroAntes?: Express.Multer.File[];
      fotoTableroDespues?: Express.Multer.File[];
      fotoBomba?: Express.Multer.File[];
    },
  ): Promise<ApiCrudResponse> {
    const folderGasolina = 'turnos/incidencias/gasolina';
    try {
      const fotoAntes = files.fotoTableroAntes?.[0];
      const fotoBomba = files.fotoBomba?.[0];
      if (!fotoAntes?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen fotoTableroAntes');
      }
      if (!fotoBomba?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen fotoBomba');
      }

      const turno = await this.repository.findOne({
        where: { id: dto.idTurno, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException({ message: 'Turno no encontrado' });
      }
      if (turno.idVehiculo == null) {
        throw new BadRequestException('El turno no tiene vehículo asociado');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const urlAntes = await this.procesarArchivo(
        fotoAntes,
        folderGasolina,
        idUser,
        EnumModulos.TURNOS,
      );
      if (!urlAntes) {
        throw new BadRequestException('No se pudo subir fotoTableroAntes');
      }
      if (urlAntes.length > 500) {
        throw new BadRequestException(
          'La URL de fotoTableroAntes supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      const urlBomba = await this.procesarArchivo(
        fotoBomba,
        folderGasolina,
        idUser,
        EnumModulos.TURNOS,
      );
      if (!urlBomba) {
        throw new BadRequestException('No se pudo subir fotoBomba');
      }
      if (urlBomba.length > 500) {
        throw new BadRequestException(
          'La URL de fotoBomba supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      let fotoTableroDespues: string | null = null;
      const fotoDespues = files.fotoTableroDespues?.[0];
      if (fotoDespues?.buffer?.length) {
        const u = await this.procesarArchivo(
          fotoDespues,
          folderGasolina,
          idUser,
          EnumModulos.TURNOS,
        );
        if (u && u.length > 500) {
          throw new BadRequestException(
            'La URL de fotoTableroDespues supera 500 caracteres (límite de columna en base de datos)',
          );
        }
        fotoTableroDespues = u;
      }

      const observaciones =
        dto.observaciones != null && String(dto.observaciones).trim() !== ''
          ? String(dto.observaciones).trim()
          : null;

      const insertResult = await this.incidenciaGasolinaRepository.insert({
        idTurno: turno.id,
        idCliente,
        idVehiculo: turno.idVehiculo,
        fotoTableroAntes: urlAntes,
        fotoTableroDespues,
        fotoBomba: urlBomba,
        kilometraje: dto.kilometraje,
        litrosCargados: dto.litrosCargados,
        totalPagado: dto.totalPagado,
        observaciones,
        latitud: dto.latitud,
        longitud: dto.longitud,
        estatus: EstatusEnum.ACTIVO,
      });
      const idNuevo = Number(insertResult.identifiers[0].id);
      const placas = turno.vehiculo?.placas?.trim() ?? '';

      return {
        status: 'success',
        message: 'Incidencia de gasolina registrada correctamente',
        data: {
          id: idNuevo,
          idTurno: Number(turno.id),
          idVehiculo: Number(turno.idVehiculo),
          nombre: placas
            ? `Gasolina #${idNuevo} — Turno #${turno.id} — ${placas}`
            : `Gasolina #${idNuevo} — Turno #${turno.id}`,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarTableroDesdeBitacora(
    dto: RegistrarTableroBitacoraDto,
    idCliente: number,
    idUser: number,
    fotoTableroFile?: Express.Multer.File,
  ): Promise<ApiCrudResponse> {
    try {
      if (!fotoTableroFile?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen fotoTablero');
      }
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }

      if (bitacora.idTablero != null) {
        throw new BadRequestException('Esta bitácora ya tiene tablero registrado');
      }
      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const urlFoto = await this.procesarArchivo(
        fotoTableroFile,
        'tablero',
        idUser,
        EnumModulos.TURNOS,
      );
      if (!urlFoto) {
        throw new BadRequestException('No se pudo subir la imagen del tablero');
      }
      if (urlFoto.length > 500) {
        throw new BadRequestException(
          'La URL de la foto supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      const idTablero = await this.repository.manager.transaction(async (manager) => {
        const tableroRepo = manager.getRepository(Tablero);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const tablero = tableroRepo.create({
          fotoTablero: urlFoto,
          idTurno: turno.id,
          idVehiculo: bitacora.idVehiculo,
          kmActual: dto.kilometraje,
        });
        const savedTablero = await tableroRepo.save(tablero);

        await bvRepo.update(bitacora.id, { idTablero: savedTablero.id });

        return Number(savedTablero.id);
      });

      return {
        status: 'success',
        message: 'Tablero registrado correctamente',
        data: {
          id: idTablero,
          nombre: `Tablero #${idTablero}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarTestigosDesdeBitacora(
    dto: RegistrarTestigosBitacoraDto,
    idCliente: number,
  ): Promise<ApiCrudResponse> {
    try {
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      if (bitacora.idTestigosVehiculo != null) {
        throw new BadRequestException('Esta bitácora ya tiene testigos registrados');
      }

      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const estatusFila = valoresIndicadoresTestigos(dto).some(
        (v) => v === EstatusEnum.ACTIVO,
      )
        ? EstatusEnum.ACTIVO
        : EstatusEnum.INACTIVO;

      const idTestigos = await this.repository.manager.transaction(async (manager) => {
        const testigosRepo = manager.getRepository(TestigosVehiculo);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const testigo = testigosRepo.create({
          idTurno: bitacora.idTurno,
          idVehiculo: bitacora.idVehiculo,
          estatus: estatusFila,
          abs: dto.abs ?? EstatusEnum.INACTIVO,
          potencia: dto.potencia ?? EstatusEnum.INACTIVO,
          cinturonSeguridad: dto.cinturonSeguridad ?? EstatusEnum.INACTIVO,
          luces: dto.luces ?? EstatusEnum.INACTIVO,
          presionAceite: dto.presionAceite ?? EstatusEnum.INACTIVO,
          bateria: dto.bateria ?? EstatusEnum.INACTIVO,
          checkEngine: dto.checkEngine ?? EstatusEnum.INACTIVO,
          airbag: dto.airbag ?? EstatusEnum.INACTIVO,
          presionNeumatico: dto.presionNeumatico ?? EstatusEnum.INACTIVO,
          sistemaFrenos: dto.sistemaFrenos ?? EstatusEnum.INACTIVO,
          temperaturaMotor: dto.temperaturaMotor ?? EstatusEnum.INACTIVO,
          fallaDireccionAsistida: dto.fallaDireccionAsistida ?? EstatusEnum.INACTIVO,
        });
        const saved = await testigosRepo.save(testigo);
        await bvRepo.update(bitacora.id, { idTestigosVehiculo: saved.id });
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Testigos registrados correctamente',
        data: {
          id: idTestigos,
          nombre: `Testigos #${idTestigos}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarNivelesFluidosDesdeBitacora(
    dto: RegistrarNivelesFluidosBitacoraDto,
    idCliente: number,
  ): Promise<ApiCrudResponse> {
    try {
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      if (bitacora.idNivelesFluidos != null) {
        throw new BadRequestException(
          'Esta bitácora ya tiene niveles de fluidos registrados',
        );
      }

      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const estatusFila = valoresFluidosDefinidos(dto).some(
        (n) => n < UMBRAL_NIVEL_FLUIDO_BAJO,
      )
        ? EstatusEnum.ACTIVO
        : EstatusEnum.INACTIVO;

      const idNiveles = await this.repository.manager.transaction(async (manager) => {
        const nivelesRepo = manager.getRepository(NivelesFluidos);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const niveles = nivelesRepo.create({
          idTurno: bitacora.idTurno,
          idVehiculo: bitacora.idVehiculo,
          estatus: estatusFila,
          gasolina: dto.gasolina ?? null,
          aceite: dto.aceite ?? null,
          bateria: dto.bateria ?? null,
          anticongelante: dto.anticongelante ?? null,
          liquidoFrenos: dto.liquidoFrenos ?? null,
        });
        const saved = await nivelesRepo.save(niveles);
        await bvRepo.update(bitacora.id, { idNivelesFluidos: saved.id });
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Niveles de fluidos registrados correctamente',
        data: {
          id: idNiveles,
          nombre: `NivelesFluidos #${idNiveles}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarLucesDesdeBitacora(
    dto: RegistrarLucesBitacoraDto,
    idCliente: number,
  ): Promise<ApiCrudResponse> {
    try {
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      if (bitacora.idLucesVehiculo != null) {
        throw new BadRequestException('Esta bitácora ya tiene luces registradas');
      }

      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const estatusFila = valoresLucesDefinidos(dto).some(
        (v) => v === EstatusEnum.INACTIVO,
      )
        ? EstatusEnum.ACTIVO
        : EstatusEnum.INACTIVO;

      const idLuces = await this.repository.manager.transaction(async (manager) => {
        const lucesRepo = manager.getRepository(LucesVehiculo);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const luces = lucesRepo.create({
          idTurno: bitacora.idTurno,
          idVehiculo: bitacora.idVehiculo,
          estatus: estatusFila,
          altas: dto.altas ?? null,
          cortas: dto.cortas ?? null,
          intermitentesDelanteras: dto.intermitentesDelanteras ?? null,
          direccionalesDelanteras: dto.direccionalesDelanteras ?? null,
          intermitentesLaterales: dto.intermitentesLaterales ?? null,
          intermitentesTraseras: dto.intermitentesTraseras ?? null,
          direccionalesTraseras: dto.direccionalesTraseras ?? null,
          reversa: dto.reversa ?? null,
          freno: dto.freno ?? null,
        });
        const saved = await lucesRepo.save(luces);
        await bvRepo.update(bitacora.id, { idLucesVehiculo: saved.id });
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Luces del vehículo registradas correctamente',
        data: {
          id: idLuces,
          nombre: `LucesVehiculo #${idLuces}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarDocumentacionDesdeBitacora(
    dto: RegistrarDocumentacionBitacoraDto,
    idCliente: number,
  ): Promise<ApiCrudResponse> {
    try {
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      if (bitacora.idDocumentacionVehiculo != null) {
        throw new BadRequestException('Esta bitácora ya tiene documentación registrada');
      }

      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const estatusFila = valoresDocumentacionDefinidos(dto).some(
        (v) => v === EstatusEnum.INACTIVO,
      )
        ? EstatusEnum.ACTIVO
        : EstatusEnum.INACTIVO;

      const idDoc = await this.repository.manager.transaction(async (manager) => {
        const docRepo = manager.getRepository(DocumentacionVehiculo);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const doc = docRepo.create({
          idTurno: bitacora.idTurno,
          idVehiculo: bitacora.idVehiculo,
          estatus: estatusFila,
          bitacoraVehicular: dto.bitacoraVehicular ?? null,
          certificadoEcologico: dto.certificadoEcologico ?? null,
          polizaSeguro: dto.polizaSeguro ?? null,
          tarjetaCirculacion: dto.tarjetaCirculacion ?? null,
          verificacion: dto.verificacion ?? null,
        });
        const saved = await docRepo.save(doc);
        await bvRepo.update(bitacora.id, { idDocumentacionVehiculo: saved.id });
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Documentación del vehículo registrada correctamente',
        data: {
          id: idDoc,
          nombre: `DocumentacionVehiculo #${idDoc}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarAccesoriosDesdeBitacora(
    dto: RegistrarAccesoriosBitacoraDto,
    idCliente: number,
  ): Promise<ApiCrudResponse> {
    try {
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      if (bitacora.idAccesoriosVehiculo != null) {
        throw new BadRequestException('Esta bitácora ya tiene accesorios registrados');
      }

      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const estatusFila = valoresAccesoriosDefinidos(dto).some(
        (v) => v === EstatusEnum.INACTIVO,
      )
        ? EstatusEnum.ACTIVO
        : EstatusEnum.INACTIVO;

      const idAcc = await this.repository.manager.transaction(async (manager) => {
        const accRepo = manager.getRepository(AccesoriosVehiculo);
        const bvRepo = manager.getRepository(BitacoraVehiculo);

        const acc = accRepo.create({
          idTurno: bitacora.idTurno,
          idVehiculo: bitacora.idVehiculo,
          estatus: estatusFila,
          limpiaparabrisas: dto.limpiaparabrisas ?? null,
          aguas: dto.aguas ?? null,
          extintor: dto.extintor ?? null,
          tringulosSeguridad: dto.tringulosSeguridad ?? null,
          stereo: dto.stereo ?? null,
          tapetes: dto.tapetes ?? null,
          herramienta: dto.herramienta ?? null,
          refaccion: dto.refaccion ?? null,
          impermeable: dto.impermeable ?? null,
        });
        const saved = await accRepo.save(acc);
        await bvRepo.update(bitacora.id, { idAccesoriosVehiculo: saved.id });
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Accesorios del vehículo registrados correctamente',
        data: {
          id: idAcc,
          nombre: `AccesoriosVehiculo #${idAcc}`,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async registrarInspeccionVehiculoExDesdeBitacora(
    dto: RegistrarInspeccionVehiculoExBitacoraDto,
    idCliente: number,
    idUser: number,
    evidenciaFotograficaFile?: Express.Multer.File,
  ): Promise<ApiCrudResponse> {
    try {
      if (!evidenciaFotograficaFile?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen evidenciaFotografica');
      }
      const bitacora = await this.bitacoraRepository.findOne({
        where: { id: dto.idBitacoraVehiculo },
        relations: ['turno'],
      });
      if (!bitacora || bitacora.idCliente !== idCliente) {
        throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
      }
      if (bitacora.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('La bitácora no está activa');
      }
      const turno = bitacora.turno;
      if (!turno) {
        throw new BadRequestException('Bitácora sin turno asociado');
      }
      if (turno.idCliente !== idCliente) {
        throw new BadRequestException('El turno no pertenece al cliente');
      }
      if (turno.estatus !== EstatusEnum.ACTIVO) {
        throw new BadRequestException('El turno no está activo');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no está en curso');
      }

      const urlFoto = await this.procesarArchivo(
        evidenciaFotograficaFile,
        'inspeccion-vehiculo-ex',
        idUser,
        EnumModulos.TURNOS,
      );
      if (!urlFoto) {
        throw new BadRequestException('No se pudo subir la imagen de evidencia');
      }
      if (urlFoto.length > 500) {
        throw new BadRequestException(
          'La URL de la evidencia supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      const idInspeccion = await this.repository.manager.transaction(async (manager) => {
        const inspRepo = manager.getRepository(InspeccionVehiculoEx);
        const row = inspRepo.create({
          idTurno: bitacora.idTurno,
          idBitacoraVehiculo: bitacora.id,
          idVehiculo: bitacora.idVehiculo,
          idCatVistaVehiculo: dto.idCatVistaVehiculo,
          partesVehiculoEx: dto.partesVehiculoEx,
          idCatTipoDano: dto.idCatTipoDano,
          idCatGradoSeveridad: dto.idCatGradoSeveridad,
          evidenciaFotografica: urlFoto,
        });
        const saved = await inspRepo.save(row);
        return Number(saved.id);
      });

      return {
        status: 'success',
        message: 'Inspección exterior del vehículo registrada correctamente',
        data: {
          id: idInspeccion,
          nombre: `InspeccionVehiculoEx #${idInspeccion}`,
          idInspeccionVehiculoEx: idInspeccion,
          idBitacoraVehiculo: dto.idBitacoraVehiculo,
          idTurno: Number(bitacora.idTurno),
          idVehiculo: Number(bitacora.idVehiculo),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async findAllList(
    idCliente: number,
    rol: number,
    idUsuario: number,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<ApiResponseCommon> {
    try {
      if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
        throw new BadRequestException(
          'fechaDesde no puede ser posterior a fechaHasta',
        );
      }

      const access = this.tenantFilter.buildTurnosAccess(
        rol,
        idCliente,
        idUsuario,
        't',
      );
      if (access.sinAcceso) {
        return { data: [] };
      }

      let dateSql = '';
      const dateParams: unknown[] = [];
      if (fechaDesde) {
        dateSql += ' AND DATE(t.FechaApertura) >= ?';
        dateParams.push(fechaDesde);
      }
      if (fechaHasta) {
        dateSql += ' AND DATE(t.FechaApertura) <= ?';
        dateParams.push(fechaHasta);
      }

      const sql = `
      SELECT
        t.Id AS id,
        t.IdVehiculo AS idVehiculo,
        t.IdCliente AS idCliente,
        t.IdUsuario AS idUsuario,
        t.IdBitacoraApertura AS idBitacoraApertura,
        t.EvidenciaApertura AS evidenciaApertura,
        t.LongitudApertura AS longitudApertura,
        t.LatitudApertura AS latitudApertura,
        t.FechaApertura AS fechaApertura,
        t.IdBitacoraCierre AS idBitacoraCierre,
        t.EvidenciaCierre AS evidenciaCierre,
        t.LongitudCierre AS longitudCierre,
        t.LatitudCierre AS latitudCierre,
        t.FechaCierre AS fechaCierre,
        t.Duracion AS duracion,
        t.Estatus AS estatus,
        t.IDEstatusTurno AS idEstatusTurno,
        t.FechaCreacion AS fechaCreacion,
        t.FechaActualizacion AS fechaActualizacion,
        v.Placas AS placas,
        v.FotoFrente AS fotoFrente,
        v.Marca AS marca,
        v.Modelo AS modelo,
        v.Id AS vehiculoId,
        v.IdCliente AS vehiculoIdCliente,
        et.Id AS etId,
        et.Nombre AS etNombre
      FROM Turnos t
      LEFT JOIN Vehiculos v ON v.Id = t.IdVehiculo
      LEFT JOIN CatEstatusTurno et ON et.Id = t.IDEstatusTurno
      WHERE 1 = 1 ${access.sql}${dateSql}
      ORDER BY t.FechaApertura DESC
    `;
      const rows = await this.repository.query(sql, [
        ...access.params,
        ...dateParams,
      ]);
      const data = rows.map((item: Record<string, unknown>) => this.mapTurnoQueryRow(item));
      return { data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error)?.message);
    }
  }

  async findAll(
    idCliente: number,
    rol: number,
    idUsuario: number,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    try {
      const access = this.tenantFilter.buildTurnosAccess(
        rol,
        idCliente,
        idUsuario,
        't',
      );
      if (access.sinAcceso) {
        return {
          data: [],
          paginated: { total: 0, page, lastPage: 1 },
        };
      }

      const offset = (page - 1) * limit;

      const sqlData = `
      SELECT
        t.Id AS id,
        t.IdVehiculo AS idVehiculo,
        t.IdCliente AS idCliente,
        t.IdUsuario AS idUsuario,
        t.IdBitacoraApertura AS idBitacoraApertura,
        t.EvidenciaApertura AS evidenciaApertura,
        t.LongitudApertura AS longitudApertura,
        t.LatitudApertura AS latitudApertura,
        t.FechaApertura AS fechaApertura,
        t.IdBitacoraCierre AS idBitacoraCierre,
        t.EvidenciaCierre AS evidenciaCierre,
        t.LongitudCierre AS longitudCierre,
        t.LatitudCierre AS latitudCierre,
        t.FechaCierre AS fechaCierre,
        t.Duracion AS duracion,
        t.Estatus AS estatus,
        t.IDEstatusTurno AS idEstatusTurno,
        t.FechaCreacion AS fechaCreacion,
        t.FechaActualizacion AS fechaActualizacion,
        v.Placas AS placas,
        v.FotoFrente AS fotoFrente,
        v.Id AS vehiculoId,
        v.IdCliente AS vehiculoIdCliente,
        et.Id AS etId,
        et.Nombre AS etNombre
      FROM Turnos t
      LEFT JOIN Vehiculos v ON v.Id = t.IdVehiculo
      LEFT JOIN CatEstatusTurno et ON et.Id = t.IDEstatusTurno
      WHERE 1 = 1 ${access.sql}
      ORDER BY t.FechaApertura DESC
      LIMIT ? OFFSET ?
    `;
      const sqlCount = `
      SELECT COUNT(*) AS total
      FROM Turnos t
      WHERE 1 = 1 ${access.sql}
    `;

      const [dataRows, totalResult] = await Promise.all([
        this.repository.query(sqlData, [...access.params, limit, offset]),
        this.repository.query(sqlCount, [...access.params]),
      ]);

      const total = Number((totalResult[0] as { total?: unknown })?.total ?? 0);
      const data = dataRows.map((item: Record<string, unknown>) =>
        this.mapTurnoQueryRow(item),
      );
      return {
        data,
        paginated: {
          total,
          page,
          lastPage: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        (error as Error).message || 'Error al obtener turnos',
      );
    }
  }

  async findOne(
    id: number,
    idCliente: number,
    idUsuario: number,
    rol: number,
    req: Request,
  ) {
    try {
      const access = this.tenantFilter.buildTurnosAccess(
        rol,
        idCliente,
        idUsuario,
        't',
      );
      if (access.sinAcceso) {
        throw new NotFoundException({ message: 'Turno no encontrado' });
      }

      const data = await loadTurnoDetalleSql(
        (sql, params) => this.repository.query(sql, params),
        id,
        access.sql,
        access.params,
      );
      if (!data) {
        throw new NotFoundException({ message: 'Turno no encontrado' });
      }

      const placa = String(data.placas ?? '').trim();
      let vehiculoNext: Record<string, unknown> | null = null;
      if (placa) {
        const proxy = await this.vehiculosService.findOneByPlaca(placa, req);
        if (proxy.status >= 200 && proxy.status < 300) {
          const payload = proxy.data as { data?: unknown };
          if (payload?.data && typeof payload.data === 'object') {
            vehiculoNext = payload.data as Record<string, unknown>;
          }
        }
      }

      const operadorNombre = await this.tryOperadorNombre(req);
      const detalleTurno = buildDetalleTurnoView(data, vehiculoNext, operadorNombre);

      return { data, detalleTurno };
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

  private async tryOperadorNombre(req: Request): Promise<string | null> {
    try {
      const r = await this.endpointProxy.forwardGet('login/me', req);
      if (r.status < 200 || r.status >= 300) {
        return null;
      }
      const data = r.data;
      if (!data || typeof data !== 'object') {
        return null;
      }
      const root = data as Record<string, unknown>;
      const inner =
        root.data && typeof root.data === 'object'
          ? (root.data as Record<string, unknown>)
          : root;
      for (const key of ['nombreCompleto', 'nombre', 'Nombres', 'userName']) {
        const value = inner[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cierra bitácora de apertura (sin datos de cierre geográfico en el turno) o de cierre (turno ya con cierre).
   * Requiere bitácora completa (sin FKs nulas) y coherencia id/tipo con el turno.
   */
  async cierreBitacoraVehiculo(
    dto: CierreBitacoraVehiculoDto,
    idCliente: number,
    req: Request,
  ): Promise<ApiCrudResponse> {
    const bitacora = await this.bitacoraRepository.findOne({
      where: { id: dto.idBitacoraVehiculo },
      relations: ['turno', 'turno.vehiculo', 'vehiculo'],
    });
    if (!bitacora || bitacora.idCliente !== idCliente) {
      throw new NotFoundException({ message: 'Bitácora vehículo no encontrada' });
    }
    if (bitacora.estatus !== EstatusEnum.ACTIVO) {
      throw new BadRequestException('La bitácora no está activa');
    }

    const turno = bitacora.turno;
    if (!turno || turno.idCliente !== idCliente) {
      throw new BadRequestException('El turno asociado no es válido para este cliente');
    }


    const faltantes = this.bitacoraVehiculoCamposFaltantes(bitacora);
    if (faltantes.length > 0) {
      throw new BadRequestException({
        message:
          'No se puede cerrar la bitácora: faltan secciones por registrar (no deben ser null)',
        camposFaltantes: faltantes,
      });
    }

    const { longitudCierre, latitudCierre, fechaCierre } = turno;
    console.log('longitudCierre', longitudCierre);
    console.log('latitudCierre', latitudCierre);
    console.log('fechaCierre', fechaCierre);
    const cierrePendiente =
      longitudCierre == null && latitudCierre == null && fechaCierre == null;
    const cierreCompleto =
      longitudCierre != null && latitudCierre != null && fechaCierre != null;

    if (!cierrePendiente && !cierreCompleto) {
      throw new BadRequestException(
        'Estado inconsistente del turno: longitudCierre, latitudCierre y fechaCierre deben ser todos null o todos con valor',
      );
    }
    console.log('cierrePendiente', cierrePendiente);
    console.log('cierreCompleto', cierreCompleto);

    if (cierrePendiente === true) {
      console.log('cierrePendiente es true');
      if (
        turno.idBitacoraApertura == null ||
        Number(bitacora.id) !== Number(turno.idBitacoraApertura)
      ) {
        throw new BadRequestException(
          'Solo se puede usar la bitácora de apertura del turno cuando el cierre geográfico aún no está registrado',
        );
      }
      if (bitacora.tipo !== EnumTipoBitacoraVehiculo.APERTURA) {
        throw new BadRequestException(
          'La bitácora debe ser de tipo apertura para este flujo',
        );
      }

      const placas =
        turno.vehiculo?.placas?.trim() || bitacora.vehiculo?.placas?.trim() || '';
      if (!placas) {
        throw new BadRequestException(
          'No se encontró placa del vehículo para sincronizar',
        );
      }

      await this.bitacoraRepository.update(bitacora.id, {
        estatus: EstatusEnum.INACTIVO,
      });
      const vehiculoPorPlaca = await this.vehiculosService.findOneByPlaca(placas, req);

      return {
        status: 'success',
        message: 'El flujo de apertura del turno ha concluido.',
        data: {
          id: Number(turno.id),
          idBitacoraVehiculo: Number(bitacora.id),
          idTurno: Number(turno.id),
          flujo: 'apertura',
          vehiculoPorPlaca,
        },
      };
    }

    if (
      turno.idBitacoraCierre == null ||
      Number(bitacora.id) !== Number(turno.idBitacoraCierre)
    ) {
      throw new BadRequestException(
        'Solo se puede usar la bitácora de cierre del turno cuando el cierre geográfico ya está registrado',
      );
    }
    if (bitacora.tipo !== EnumTipoBitacoraVehiculo.CIERRE) {
      throw new BadRequestException(
        'La bitácora debe ser de tipo cierre para este flujo',
      );
    }

    await this.repository.manager.transaction(async (manager) => {
      await manager.getRepository(BitacoraVehiculo).update(bitacora.id, {
        estatus: EstatusEnum.INACTIVO,
      });
      await manager.getRepository(Turnos).update(turno.id, {
        estatus: EstatusEnum.INACTIVO,
        idEstatusTurno: EnumEstatusTurno.FINALIZADO,
      });
    });

    const placas =
      turno.vehiculo?.placas?.trim() || bitacora.vehiculo?.placas?.trim() || '';

    return {
      status: 'success',
      message: 'Bitácora de cierre finalizada y turno marcado como finalizado.',
      data: {
        id: Number(turno.id),
        idBitacoraVehiculo: Number(bitacora.id),
        idTurno: Number(turno.id),
        nombre: placas ? `Turno #${turno.id} - ${placas}` : `Turno #${turno.id}`,
        flujo: 'cierre',
      },
    };
  }

  private bitacoraVehiculoCamposFaltantes(b: BitacoraVehiculo): string[] {
    const faltantes: string[] = [];
    if (b.tipo == null) faltantes.push('tipo');
    if (b.idTablero == null) faltantes.push('idTablero');
    if (b.idTestigosVehiculo == null) faltantes.push('idTestigosVehiculo');
    if (b.idNivelesFluidos == null) faltantes.push('idNivelesFluidos');
    if (b.idLucesVehiculo == null) faltantes.push('idLucesVehiculo');
    if (b.idAccesoriosVehiculo == null) faltantes.push('idAccesoriosVehiculo');
    if (b.idDocumentacionVehiculo == null) faltantes.push('idDocumentacionVehiculo');
    return faltantes;
  }

  async update(
    dto: UpdateTurnoDto,
    idCliente: number,
    idUser: number,
    evidenciaCierreFile?: Express.Multer.File,
  ): Promise<ApiCrudResponse> {
    try {
      if (!evidenciaCierreFile?.buffer?.length) {
        throw new BadRequestException('Debe adjuntar la imagen evidenciaCierre');
      }

      const turno = await this.repository.findOne({
        where: { id: dto.idTurno, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }
      if (
        turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO &&
        turno.idEstatusTurno !== EnumEstatusTurno.PROGRAMADO &&
        turno.idEstatusTurno !== EnumEstatusTurno.CANCELADO
      ) {
        throw new BadRequestException(
          'Solo se puede cerrar un turno en curso, programado o cancelado',
        );
      }
      if (turno.fechaCierre != null || turno.idBitacoraCierre != null) {
        throw new BadRequestException('Este turno ya fue cerrado');
      }
      if (turno.idVehiculo == null) {
        throw new BadRequestException('El turno no tiene vehículo asociado');
      }
      if (turno.idCliente == null) {
        throw new BadRequestException('El turno no tiene cliente asociado');
      }

      const urlEvidencia = await this.procesarArchivo(
        evidenciaCierreFile,
        'Turnos',
        idUser,
        EnumModulos.TURNOS,
      );
      if (!urlEvidencia) {
        throw new BadRequestException(
          'No se pudo subir la imagen de evidencia de cierre',
        );
      }
      if (urlEvidencia.length > 500) {
        throw new BadRequestException(
          'La URL de evidencia supera 500 caracteres (límite de columna en base de datos)',
        );
      }

      const fechaCierre = new Date(Date.now());
      const apertura = turno.fechaApertura ? new Date(turno.fechaApertura) : null;
      const duracion =
        apertura != null && !Number.isNaN(apertura.getTime())
          ? msToMysqlTime(fechaCierre.getTime() - apertura.getTime())
          : null;

      const idVehiculoTurno = turno.idVehiculo;
      const idClienteTurno = turno.idCliente;

      const { idBitacoraCierre: idBitacoraCierreNuevo, placas } =
        await this.repository.manager.transaction(async (manager) => {
          const turnoRepo = manager.getRepository(Turnos);
          const bitacoraRepo = manager.getRepository(BitacoraVehiculo);

          const insertResult = await bitacoraRepo.insert({
            idVehiculo: idVehiculoTurno,
            idCliente: idClienteTurno,
            idTurno: turno.id,
            tipo: EnumTipoBitacoraVehiculo.CIERRE,
            estatus: EstatusEnum.ACTIVO,
          });
          const idBv = Number(insertResult.identifiers[0].id);

          await turnoRepo.update(dto.idTurno, {
            latitudCierre: dto.latitud,
            longitudCierre: dto.longitud,
            evidenciaCierre: urlEvidencia,
            fechaCierre,
            duracion,
            idBitacoraCierre: idBv,
          });

          const turnoResult = await turnoRepo.findOne({
            where: { id: dto.idTurno, idCliente },
            relations: ['vehiculo'],
          });
          return {
            idBitacoraCierre: idBv,
            placas: turnoResult?.vehiculo?.placas ?? '',
          };
        });

      return {
        status: 'success',
        message: 'Turno cerrado correctamente',
        data: {
          id: dto.idTurno,
          nombre: `Turno #${dto.idTurno} - ${placas}`,
          idBitacoraCierre: idBitacoraCierreNuevo,
          duracion,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  async updateEstatus(
    idTurno: number,
    idCliente: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const turno = await this.repository.findOne({
        where: { id: idTurno, idCliente },
        relations: ['vehiculo'],
      });
      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }
      if (turno.idEstatusTurno !== EnumEstatusTurno.EN_CURSO) {
        throw new BadRequestException('El turno no ha iniciado o está cerrado');
      }

      await this.repository.manager.transaction(async (manager) => {
        const turnoRepo = manager.getRepository(Turnos);
        const bitacoraRepo = manager.getRepository(BitacoraVehiculo);

        await turnoRepo.update(idTurno, {
          estatus: EstatusEnum.INACTIVO,
          idEstatusTurno: EnumEstatusTurno.CANCELADO,
        });

        if (turno.idBitacoraApertura != null) {
          await bitacoraRepo.update(turno.idBitacoraApertura, {
            estatus: EstatusEnum.INACTIVO,
          });
        }

        if (turno.idBitacoraCierre != null) {
          await bitacoraRepo.update(turno.idBitacoraCierre, {
            estatus: EstatusEnum.INACTIVO,
          });
        }
      });

      return {
        status: 'success',
        message: 'Turno cancelado correctamente',
        estatus: { estatus: EstatusEnum.INACTIVO },
        data: {
          id: idTurno,
          nombre: `Turno #${idTurno} - ${turno.vehiculo?.placas ?? ''}`,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al cancelar el turno con id: ${idTurno}`,
      );
    }
  }

  /**
   * Turno en curso del operador (IdUsuario del JWT): estatus activo + catálogo EN_CURSO.
   */
  async findMiTurnoActivo(
    idUsuario: number,
    idCliente: number,
    req: Request,
  ): Promise<MiTurnoActivoResponseDto> {
    const [turno, ultimoTurno, ultimaIncidenciaAccidente, ultimaIncidenciaGasolina] =
      await Promise.all([
        this.repository.findOne({
          where: {
            idUsuario,
            idCliente,
            estatus: EstatusEnum.ACTIVO,
            idEstatusTurno: EnumEstatusTurno.EN_CURSO,
          },
          relations: ['vehiculo'],
          order: { fechaApertura: 'DESC' },
        }),
        this.findUltimoTurnoCerrado(idUsuario, idCliente, req),
        this.findUltimaIncidenciaAccidente(idUsuario, idCliente),
        this.findUltimaIncidenciaGasolina(idUsuario, idCliente),
      ]);

    if (!turno?.fechaApertura) {
      return {
        turnoActivo: false,
        idTurno: null,
        fechaInicio: null,
        duracionSegundos: null,
        vehiculo: null,
        ultimoTurno,
        ultimaIncidenciaAccidente,
        ultimaIncidenciaGasolina,
      };
    }

    const inicioMs = new Date(turno.fechaApertura).getTime();
    const duracionSegundos = Math.max(
      0,
      Math.floor((Date.now() - inicioMs) / 1000),
    );
    const v = turno.vehiculo;
    let detalleNext: Record<string, unknown> | null = null;

    const placa = v?.placas?.trim();
    if (placa) {
      const proxy = await this.vehiculosService.findOneByPlaca(placa, req);
      if (proxy.status >= 200 && proxy.status < 300) {
        const payload = proxy.data as { data?: unknown };
        if (payload?.data && typeof payload.data === 'object') {
          detalleNext = payload.data as Record<string, unknown>;
        }
      }
    }

    return {
      turnoActivo: true,
      idTurno: Number(turno.id),
      fechaInicio: new Date(turno.fechaApertura).toISOString(),
      duracionSegundos,
      vehiculo: v
        ? {
          id: Number(v.id),
          placas: v.placas,
          fotoFrente: v.fotoFrente ?? null,
          idCliente: Number(v.idCliente),
          detalle: detalleNext,
        }
        : null,
      ultimoTurno,
      ultimaIncidenciaAccidente,
      ultimaIncidenciaGasolina,
    };
  }


  private async findUltimaIncidenciaAccidente(
    idUsuario: number,
    idCliente: number,
  ): Promise<MiTurnoUltimaIncidenciaAccidenteDto | null> {
    const incidencia = await this.incidenciaAccidenteRepository
      .createQueryBuilder('ia')
      .innerJoin('ia.turno', 't')
      .where('t.idUsuario = :idUsuario', { idUsuario })
      .andWhere('t.idCliente = :idCliente', { idCliente })
      .andWhere('ia.estatus = :estatus', { estatus: EstatusEnum.ACTIVO })
      .orderBy('ia.fechaRegistro', 'DESC')
      .select(['ia.fechaRegistro', 'ia.descripcion'])
      .getOne();

    if (!incidencia) {
      return null;
    }
    return {
      fechaRegistro: incidencia.fechaRegistro
        ? new Date(incidencia.fechaRegistro).toISOString()
        : null,
      descripcion: incidencia.descripcion?.trim() ?? null,
    };
  }

  private async findUltimaIncidenciaGasolina(
    idUsuario: number,
    idCliente: number,
  ): Promise<MiTurnoUltimaIncidenciaGasolinaDto | null> {
    const incidencia = await this.incidenciaGasolinaRepository
      .createQueryBuilder('ig')
      .innerJoin('ig.turno', 't')
      .where('t.idUsuario = :idUsuario', { idUsuario })
      .andWhere('t.idCliente = :idCliente', { idCliente })
      .andWhere('ig.estatus = :estatus', { estatus: EstatusEnum.ACTIVO })
      .orderBy('ig.fechaRegistro', 'DESC')
      .select(['ig.fechaRegistro', 'ig.litrosCargados'])
      .getOne();

    if (!incidencia) {
      return null;
    }

    return {
      fechaRegistro: incidencia.fechaRegistro
        ? new Date(incidencia.fechaRegistro).toISOString()
        : null,
      litrosCargados:
        incidencia.litrosCargados != null &&
          Number.isFinite(Number(incidencia.litrosCargados))
          ? Number(incidencia.litrosCargados)
          : null,
    };
  }

  private async findUltimoTurnoCerrado(
    idUsuario: number,
    idCliente: number,
    req: Request,
  ): Promise<MiTurnoUltimoTurnoDto | null> {
    const turno = await this.repository.findOne({
      where: {
        idUsuario,
        idCliente,
        estatus: EstatusEnum.INACTIVO,
        idEstatusTurno: EnumEstatusTurno.FINALIZADO,
        fechaCierre: Not(IsNull()),
      },
      relations: ['vehiculo'],
      order: { fechaCierre: 'DESC' },
    });

    if (!turno) {
      return null;
    }

    const placa = turno.vehiculo?.placas?.trim() ?? null;
    let marca: string | null = null;
    let modelo: string | null = null;

    if (placa) {
      const proxy = await this.vehiculosService.findOneByPlaca(placa, req);
      if (proxy.status >= 200 && proxy.status < 300) {
        const payload = proxy.data as { data?: Record<string, unknown> };
        const detalle = payload?.data;
        if (detalle && typeof detalle === 'object') {
          const marcaRaw = detalle['marcaNombre'] ?? detalle['marca'];
          const modeloRaw = detalle['modeloNombre'] ?? detalle['modelo'];
          marca =
            marcaRaw != null && String(marcaRaw).trim()
              ? String(marcaRaw).trim()
              : null;
          modelo =
            modeloRaw != null && String(modeloRaw).trim()
              ? String(modeloRaw).trim()
              : null;
        }
      }
    }

    return {
      fechaCierre: turno.fechaCierre
        ? new Date(turno.fechaCierre).toISOString()
        : null,
      placa,
      marca,
      modelo,
      duracion: normalizeMysqlTime(turno.duracion),
    };
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

      return {
        status: 'success',
        message: 'Turno eliminado correctamente',
        data: {
          id,
          nombre: `Turno #${id} - ${turno.vehiculo?.placas ?? ''}`,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al eliminar turno.',
        error: (error as Error).message,
      });
    }
  }
}
