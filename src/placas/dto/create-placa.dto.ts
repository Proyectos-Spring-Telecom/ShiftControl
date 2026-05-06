import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlacaDto {
  @ApiProperty({ example: 'ABC-12-34', description: 'Número de placa' })
  @IsString()
  @MaxLength(20)
  numeroPlaca: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  anio?: number;

  @ApiPropertyOptional({ example: 'Blanco' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @ApiPropertyOptional({ example: 'Eco-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  economico?: string;
}
