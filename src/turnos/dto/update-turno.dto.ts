import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsInt, IsDateString } from 'class-validator';

export class UpdateTurnoDto {
  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'ID estatus turno', example: 2, required: false })
  idEstatusTurno?: number;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Fecha de cierre (ISO 8601)',
    required: false,
  })
  fechaCierre?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Duración en minutos', required: false })
  duracion?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Latitud de apertura', required: false })
  latitudApertura?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Longitud de apertura', required: false })
  longitudApertura?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Latitud de cierre', required: false })
  latitudCierre?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Longitud de cierre', required: false })
  longitudCierre?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'ID Bitácora de apertura', required: false })
  idBitacoraApertura?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'ID Evidencia de apertura', required: false })
  evidenciaApertura?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'ID Bitácora de cierre', required: false })
  idBitacoraCierre?: number;

  @IsOptional()
  @IsInt()
  @ApiProperty({ description: 'ID Evidencia de cierre', required: false })
  evidenciaCierre?: number;
}
