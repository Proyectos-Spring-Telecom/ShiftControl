import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class FiltroReporteVehiculoDto {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO 8601)' })
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Fecha fin (ISO 8601)' })
  fechaFin?: string;
}
