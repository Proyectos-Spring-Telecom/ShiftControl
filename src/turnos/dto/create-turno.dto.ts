import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTurnoDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Latitud de apertura', example: 18.9242156 })
  latitud: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Longitud de apertura', example: -99.2340987 })
  longitud: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'URL de evidencia solo si no se usa archivo (sin OCR de placa en ese flujo)',
    required: false,
  })
  evidenciaAperturaUrl?: string;
}
