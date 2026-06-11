import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { EstatusEnum } from 'src/common/estatus.enum';

const docEnum = {
  enum: EstatusEnum,
  enumName: 'EstatusEnum',
  example: EstatusEnum.INACTIVO,
};

export class RegistrarDocumentacionBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(docEnum)
  bitacoraVehicular?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(docEnum)
  certificadoEcologico?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(docEnum)
  polizaSeguro?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(docEnum)
  tarjetaCirculacion?: EstatusEnum;

  @IsOptional()
  @IsEnum(EstatusEnum)
  @ApiPropertyOptional(docEnum)
  verificacion?: EstatusEnum;
}
