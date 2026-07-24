import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MiTurnoActivoVehiculoDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 'NU-7653-B' })
  placas: string;

  @ApiPropertyOptional({ example: 'http://localhost:3003/files/turnos/15/uuid.jpg' })
  fotoFrente: string | null;

  @ApiProperty({ example: 11 })
  idCliente: number;

  @ApiPropertyOptional({
    description:
      'Datos enriquecidos desde Next (`GET /vehiculos/placa/:placa`): marca, modelo, tipo, combustible, cliente, etc.',
    nullable: true,
    example: {
      id: 42,
      placa: 'NU-7653-B',
      marca: 'Nissan',
      modelo: 'NP300',
      tipoVehiculo: 'Pick up',
      combustible: 'Gasolina',
    },
  })
  detalle: Record<string, unknown> | null;
}

export class MiTurnoUltimoTurnoDto {
  @ApiPropertyOptional({
    description: 'Fecha/hora de cierre del último turno cerrado (ISO 8601)',
    example: '2026-06-09T18:30:00.000Z',
    nullable: true,
  })
  fechaCierre: string | null;

  @ApiPropertyOptional({ example: 'NU-7653-B', nullable: true })
  placa: string | null;

  @ApiPropertyOptional({ example: 'Volkswagen', nullable: true })
  marca: string | null;

  @ApiPropertyOptional({ example: 'Virtus', nullable: true })
  modelo: string | null;

  @ApiPropertyOptional({
    description: 'Duración del turno (columna Turnos.Duracion, tipo TIME `HH:MM:SS`)',
    example: '08:30:00',
    nullable: true,
  })
  duracion: string | null;
}

export class MiTurnoUltimaIncidenciaAccidenteDto {
  @ApiPropertyOptional({
    description: 'Fecha/hora de registro (ISO 8601)',
    example: '2026-06-08T14:22:00.000Z',
    nullable: true,
  })
  fechaRegistro: string | null;

  @ApiPropertyOptional({
    example: 'Golpe en parachoques frontal',
    nullable: true,
  })
  descripcion: string | null;
}

export class MiTurnoUltimaIncidenciaGasolinaDto {
  @ApiPropertyOptional({
    description: 'Fecha/hora de registro (ISO 8601)',
    example: '2026-06-07T09:15:00.000Z',
    nullable: true,
  })
  fechaRegistro: string | null;

  @ApiPropertyOptional({ example: 45.5, nullable: true })
  litrosCargados: number | null;
}

/** Referencia al turno más reciente por apertura (siempre presente en la respuesta). */
export class MiTurnoTurnoActualDto {
  @ApiProperty({
    description: 'Etiqueta descriptiva para UI',
    example: 'Turno actual',
  })
  etiqueta: string;

  @ApiPropertyOptional({ example: 15, nullable: true })
  idTurno: number | null;

  @ApiPropertyOptional({
    description: 'Fecha/hora de apertura del turno (ISO 8601)',
    example: '2026-06-04T14:30:00.000Z',
    nullable: true,
  })
  fechaApertura: string | null;

  @ApiPropertyOptional({
    description: 'true si el turno está en catálogo EN_CURSO',
    example: true,
  })
  enCurso: boolean;
}

/** Respuesta de GET /api/turnos/mi-turno (turno en curso del usuario autenticado). */
export class MiTurnoActivoResponseDto {
  @ApiProperty({
    description: 'true si existe un turno en curso para el usuario del token',
    example: true,
  })
  turnoActivo: boolean;

  @ApiPropertyOptional({ example: 15, nullable: true })
  idTurno: number | null;

  @ApiPropertyOptional({
    description: 'Fecha/hora de apertura del turno (ISO 8601)',
    example: '2026-06-04T14:30:00.000Z',
    nullable: true,
  })
  fechaInicio: string | null;

  @ApiPropertyOptional({
    description: 'Segundos transcurridos desde fechaInicio hasta ahora',
    example: 3720,
    nullable: true,
  })
  duracionSegundos: number | null;

  @ApiPropertyOptional({ type: MiTurnoActivoVehiculoDto, nullable: true })
  vehiculo: MiTurnoActivoVehiculoDto | null;

  @ApiPropertyOptional({
    type: MiTurnoUltimoTurnoDto,
    description:
      'Último turno cerrado y finalizado del usuario (JWT): estatus 0, idEstatusTurno 3; fechaCierre, placa, marca, modelo y duración (TIME)',
    nullable: true,
  })
  ultimoTurno: MiTurnoUltimoTurnoDto | null;

  @ApiPropertyOptional({
    type: MiTurnoUltimaIncidenciaAccidenteDto,
    description:
      'Última incidencia de accidente del usuario (JWT): fechaRegistro y descripcion',
    nullable: true,
  })
  ultimaIncidenciaAccidente: MiTurnoUltimaIncidenciaAccidenteDto | null;

  @ApiPropertyOptional({
    type: MiTurnoUltimaIncidenciaGasolinaDto,
    description:
      'Última incidencia de gasolina del usuario (JWT): fechaRegistro y litrosCargados',
    nullable: true,
  })
  ultimaIncidenciaGasolina: MiTurnoUltimaIncidenciaGasolinaDto | null;

  @ApiProperty({
    type: MiTurnoTurnoActualDto,
    description:
      'Referencia al turno más reciente por fecha de apertura: turno en curso, último abierto sin cierre o último turno del usuario. Siempre presente (nunca null).',
  })
  turnoActual: MiTurnoTurnoActualDto;
}
