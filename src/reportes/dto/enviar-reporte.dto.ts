import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnviarReporteTurnoDto {
  @ApiProperty({
    description: 'Correo electrónico del destinatario',
    example: 'usuario@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  destinatario: string;

  @ApiPropertyOptional({
    description: 'Asunto del correo (se genera automáticamente si no se envía)',
  })
  @IsOptional()
  @IsString()
  asunto?: string;
}

export class EnviarReporteVehiculoDto {
  @ApiProperty({
    description: 'Correo electrónico del destinatario',
    example: 'usuario@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  destinatario: string;

  @ApiPropertyOptional({ description: 'Asunto del correo' })
  @IsOptional()
  @IsString()
  asunto?: string;

  @ApiPropertyOptional({
    description: 'Fecha inicio ISO 8601',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha fin ISO 8601',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
