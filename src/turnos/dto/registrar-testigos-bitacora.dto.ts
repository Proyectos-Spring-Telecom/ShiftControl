import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
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

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  temperaturaMotorAlta: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  presionAceite: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  bateria: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  airbag: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  checkEngine: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  abs: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  sistemaFrenos: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  controlEstabilidad: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  controlTraccion: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  nivelCombustible: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  filtroParticulas: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  bujiasIncandecentes: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  presionNeumatico: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  fallaDireccionAsistida: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  refrigeranteMotor: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  bloqueoDiferencial: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  controlAcelerador: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  llavePresencia: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  nivelLiquidoFrenos: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  cajuela: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  puerta: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  cinturonSeguridad: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  cambioAceite: EstatusEnum;

  @IsEnum(EstatusEnum)
  @ApiProperty(indicadorEnum)
  servicio: EstatusEnum;
}
