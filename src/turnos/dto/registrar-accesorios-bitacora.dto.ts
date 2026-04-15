import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { EstatusEnum } from 'src/common/estatus.enum';

const accEnum = {
  enum: EstatusEnum,
  enumName: 'EstatusEnum',
  example: EstatusEnum.INACTIVO,
};

export class RegistrarAccesoriosBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  limpiaparabrisas?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  extintor?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  tringulosSeguridad?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  stereo?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  tapetes?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  refaccion?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  gato?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(accEnum)
  birloSeguridad?: EstatusEnum;
}
