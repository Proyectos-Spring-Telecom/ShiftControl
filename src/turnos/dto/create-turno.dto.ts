import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTurnoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  @ApiProperty({ description: 'Número de placa del vehículo', example: 'NU-7653-B' })
  placa: string;

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
      'URL de evidencia solo si no se usa archivo multipart evidenciaApertura',
    required: false,
  })
  evidenciaAperturaUrl?: string;
}