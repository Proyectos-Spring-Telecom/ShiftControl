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

export class CrearIncidenciaAccidenteDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Id del turno en curso', example: 1 })
  idTurno: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(65535)
  @ApiProperty({ example: 'Golpe en parachoques frontal' })
  descripcion: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Si no se envía, se usa id 1 (debe existir y estar activo en CatTipoIncidente)',
    example: 1,
  })
  idCatTipoIncidente?: number;
}
