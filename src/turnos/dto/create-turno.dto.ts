import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { EnumEstatusTurno } from 'src/common/estatus.enum';

export class CreateTurnoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  @ApiProperty({
    description: 'Placa del vehículo (tabla sombra local; mismo valor que en Next)',
    example: 'ABC123DE',
  })
  placa: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: 'Latitud de apertura',
    example: 18.9242156,
    required: false,
  })
  latitud?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: 'Longitud de apertura',
    example: -99.2340987,
    required: false,
  })
  longitud?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @IsEnum(EnumEstatusTurno)
  idEstatusTurno?: EnumEstatusTurno.EN_CURSO;
}
