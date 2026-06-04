import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MiTurnoActivoVehiculoDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 'NU-7653-B' })
  placas: string;

  @ApiPropertyOptional({ example: 'https://bucket.s3.amazonaws.com/foto.jpg' })
  fotoFrente: string | null;

  @ApiProperty({ example: 11 })
  idCliente: number;
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
}
