import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { EstatusEnum } from 'src/common/estatus.enum';

const luzEnum = {
  enum: EstatusEnum,
  enumName: 'EstatusEnum',
  example: EstatusEnum.INACTIVO,
};

export class RegistrarLucesBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  altas?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  cortas?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  intermitentesDelanteras?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  intermitentesTraseras?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  direccionalesDelanteras?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  direccionalesTraseras?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(luzEnum)
  intermitentesLaterales?: EstatusEnum;
}
