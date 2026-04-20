import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearIncidenciaGasolinaDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Id del turno en curso', example: 1 })
  idTurno: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 19.4326077 })
  latitud: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: -99.133208 })
  longitud: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Kilometraje actual del vehículo', example: 45230.5 })
  kilometraje: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  @ApiProperty({ description: 'Litros de combustible cargados', example: 42.5 })
  litrosCargados: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ApiProperty({ description: 'Monto total pagado (MXN)', example: 1250.5 })
  totalPagado: number;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  @ApiPropertyOptional({
    description: 'Notas (estación, tipo de gasolina, etc.)',
    example: 'Pemex Magna, estación Av. Reforma',
  })
  observaciones?: string;
}
