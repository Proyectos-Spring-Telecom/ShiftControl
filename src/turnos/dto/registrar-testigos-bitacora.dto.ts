import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { EstatusEnum } from 'src/common/estatus.enum';

const indicadorEnum = {
  enum: EstatusEnum,
  enumName: 'EstatusEnum',
  example: EstatusEnum.INACTIVO,
};

export class RegistrarTestigosBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  abs?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  potencia?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  cinturonSeguridad?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  luces?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  presionAceite?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  bateria?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  checkEngine?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  airbag?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  presionNeumatico?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  sistemaFrenos?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  temperaturaMotor?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(indicadorEnum)
  fallaDireccionAsistida?: EstatusEnum;
}
