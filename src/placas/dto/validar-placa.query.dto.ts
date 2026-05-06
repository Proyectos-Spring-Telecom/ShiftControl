import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

/** Query para `GET /placas/validar` (proxy BehaviorIQ). */
export class ValidarPlacaQueryDto {
  @ApiProperty({ example: 'ABC-123', description: 'Número de placa a consultar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroPlaca: string;

  @ApiPropertyOptional({ description: 'Root: filtrar por cliente en BehaviorIQ' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  idCliente?: string;

  @ApiPropertyOptional({ description: 'Root: filtrar por solución en BehaviorIQ' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  idSolucion?: string;

  @ApiPropertyOptional({ example: 19.4326 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitud?: number;

  @ApiPropertyOptional({ example: -99.1332 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitud?: number;
}
