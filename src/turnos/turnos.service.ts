import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { UpdateTurnoEstatusDto } from './dto/update-turno-estatus.dto';
import { CierreBitacoraVehiculoDto } from './dto/cierre-bitacora-vehiculo.dto';
import {
  EnumEstatusTurno,
  EstatusEnum,
  EnumModulos,
  EnumTipoBitacoraVehiculo,
} from 'src/common/estatus.enum';
import { S3Service } from 'src/s3/s3.service';
import { BehaviorIqAuthService } from 'src/integration/behavioriq/behavioriq-auth.service';
import { BehaviorIqPlateService } from 'src/integration/behavioriq/behavioriq-plate.service';
import { VehiculosService } from 'src/vehiculos/vehiculos.service';
import type { Request } from 'express';

const OCR_MIN_CONFIDENCE = 0.7;
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
  return [
    dto.temperaturaMotorAlta,
    dto.presionAceite,
    dto.bateria,
    dto.airbag,
    dto.checkEngine,
    dto.abs,
    dto.sistemaFrenos,
    dto.controlEstabilidad,
    dto.controlTraccion,
    dto.nivelCombustible,
    dto.filtroParticulas,
    dto.bujiasIncandecentes,
    dto.presionNeumatico,
    dto.fallaDireccionAsistida,
    dto.refrigeranteMotor,
    dto.bloqueoDiferencial,
    dto.controlAcelerador,
    dto.llavePresencia,
    dto.nivelLiquidoFrenos,
    dto.cajuela,
    dto.puerta,
    dto.cinturonSeguridad,
    dto.cambioAceite,
    dto.servicio,
  ];
}

function valoresLucesDefinidos(dto: RegistrarLucesBitacoraDto): EstatusEnum[] {
  const keys = [
    'altas',
    'cortas',
    'intermitentesDelanteras',
    'intermitentesTraseras',
    'direccionalesDelanteras',
    'direccionalesTraseras',
    'intermitentesLaterales',
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
    'tarjetaCirculacion',
    'verificacion',
    'polizaSeguro',
    'tenencia',
    'certificadoEcologico',
    'manual',
    'permisoCarga',
    'cartaPorte',
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
    'extintor',
    'tringulosSeguridad',
    'stereo',
    'tapetes',
    'refaccion',
    'gato',
    'birloSeguridad',
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
    private readonly s3Service: S3Service,
    private readonly behaviorIqAuth: BehaviorIqAuthService,
    private readonly behaviorIqPlate: BehaviorIqPlateService,
    private readonly vehiculosService: VehiculosService,
  ) {}

  private normalizePlacaKey(value: string): string {
    return value.toUpperCase().replace(/[-\s]/g, '');
  }

  private mapTurnoRow(t: Turnos) {
    return {
      ...t,
      id: Number(t.id),
      idVehiculo: t.idVehiculo != null ? Number(t.idVehiculo) : null,
      idCliente: t.idCliente != null ? Number(t.idCliente) : null,
      idUsuario: t.idUsuario != null ? Number(t.idUsuario) : null,
      idBitacoraApertura:
        t.idBitacoraApertura != null ? Number(t.idBitacoraApertura) : null,
      evidenciaApertura: t.evidenciaApertura ?? null,
      idBitacoraCierre: t.idBitacoraCierre != null ? Number(t.idBitacoraCierre) : null,
      evidenciaCierre: t.evidenciaCierre ?? null,
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
          'Debe adjuntar la imagen evidenciaApertura para lectura de placa (OCR)',
        );
      }

      const { token } = await this.behaviorIqAuth.loginWithEnvCredentials();
      const ocr = await this.behaviorIqPlate.readPlate(evidenciaAperturaFile, token);

      console.log(ocr);
      if (ocr.confidence <= OCR_MIN_CONFIDENCE) {
        throw new BadRequestException(
          `Confianza del OCR demasiado baja (${ocr.confidence.toFixed(3)}; debe ser mayor a ${OCR_MIN_CONFIDENCE})`,
        );
      }

      const placaOcrNorm = this.normalizePlacaKey(ocr.plate_number.trim());
      if (!placaOcrNorm) {
        throw new BadRequestException('OCR no devolvió un número de placa válido');
      }

      const vehiculo = await this.vehiculosRepository
        .createQueryBuilder('v')
        .where(`REPLACE(REPLACE(UPPER(TRIM(v.placas)), '-', ''), ' ', '') = :norm`, {
          norm: placaOcrNorm,
        })
        .getOne();

      if (!vehiculo) {
        throw new BadRequestException(
          `Vehículo con placa detectada "${ocr.plate_number}" no encontrado en tabla sombra. Ejecute POST /api/vehiculos/sync primero`,
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

      const placaParaNext = vehiculo.placas?.trim() || ocr.plate_number.trim();
      const vehiculoPorPlaca = await this.vehiculosService.findOneByPlaca(
        placaParaNext,
        req,
      );

      return {
        status: 'success',
        message: 'Turno creado correctamente',
        data: {
          id: Number(saved.id),
          nombre: `Turno #${saved.id} - ${vehiculo.placas}`,
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
          idTablero,
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
          temperaturaMotorAlta: dto.temperaturaMotorAlta,
          presionAceite: dto.presionAceite,
          bateria: dto.bateria,
          airbag: dto.airbag,
          checkEngine: dto.checkEngine,
          abs: dto.abs,
          sistemaFrenos: dto.sistemaFrenos,
          controlEstabilidad: dto.controlEstabilidad,
          controlTraccion: dto.controlTraccion,
          nivelCombustible: dto.nivelCombustible,
          filtroParticulas: dto.filtroParticulas,
          bujiasIncandecentes: dto.bujiasIncandecentes,
          presionNeumatico: dto.presionNeumatico,
          fallaDireccionAsistida: dto.fallaDireccionAsistida,
          refrigeranteMotor: dto.refrigeranteMotor,
          bloqueoDiferencial: dto.bloqueoDiferencial,
          controlAcelerador: dto.controlAcelerador,
          llavePresencia: dto.llavePresencia,
          nivelLiquidoFrenos: dto.nivelLiquidoFrenos,
          cajuela: dto.cajuela,
          puerta: dto.puerta,
          cinturonSeguridad: dto.cinturonSeguridad,
          cambioAceite: dto.cambioAceite,
          servicio: dto.servicio,
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
          idTestigosVehiculo: idTestigos,
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
          idNivelesFluidos: idNiveles,
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

      const estatusFila = valoresLucesDefinidos(dto).some((v) => v === EstatusEnum.ACTIVO)
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
          intermitentesTraseras: dto.intermitentesTraseras ?? null,
          direccionalesDelanteras: dto.direccionalesDelanteras ?? null,
          direccionalesTraseras: dto.direccionalesTraseras ?? null,
          intermitentesLaterales: dto.intermitentesLaterales ?? null,
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
          idLucesVehiculo: idLuces,
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
        (v) => v === EstatusEnum.ACTIVO,
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
          tarjetaCirculacion: dto.tarjetaCirculacion ?? null,
          verificacion: dto.verificacion ?? null,
          polizaSeguro: dto.polizaSeguro ?? null,
          tenencia: dto.tenencia ?? null,
          certificadoEcologico: dto.certificadoEcologico ?? null,
          manual: dto.manual ?? null,
          permisoCarga: dto.permisoCarga ?? null,
          cartaPorte: dto.cartaPorte ?? null,
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
          idDocumentacionVehiculo: idDoc,
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
        (v) => v === EstatusEnum.ACTIVO,
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
          extintor: dto.extintor ?? null,
          tringulosSeguridad: dto.tringulosSeguridad ?? null,
          stereo: dto.stereo ?? null,
          tapetes: dto.tapetes ?? null,
          refaccion: dto.refaccion ?? null,
          gato: dto.gato ?? null,
          birloSeguridad: dto.birloSeguridad ?? null,
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
          idAccesoriosVehiculo: idAcc,
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
          idCatPartesVehiculoEx: dto.idCatPartesVehiculoEx,
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
        throw new BadRequestException('La bitácora debe ser de tipo apertura para este flujo');
      }

      const placas =
        turno.vehiculo?.placas?.trim() ||
        bitacora.vehiculo?.placas?.trim() ||
        '';
      if (!placas) {
        throw new BadRequestException('No se encontró placa del vehículo para sincronizar');
      }

      await this.bitacoraRepository.update(bitacora.id, { estatus: EstatusEnum.INACTIVO });
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
      throw new BadRequestException('La bitácora debe ser de tipo cierre para este flujo');
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

    const placas = turno.vehiculo?.placas?.trim() || bitacora.vehiculo?.placas?.trim() || '';

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
      const duracionHoras =
        apertura != null && !Number.isNaN(apertura.getTime())
          ? (fechaCierre.getTime() - apertura.getTime()) / (1000 * 60 * 60)
          : null;

      console.log('duracionHoras', duracionHoras);

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
            duracion: duracionHoras,
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
          duracion: duracionHoras,
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
