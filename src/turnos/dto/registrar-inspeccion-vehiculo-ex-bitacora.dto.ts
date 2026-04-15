import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RegistrarInspeccionVehiculoExBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id CatVistaVehiculo', example: 1 })
  idCatVistaVehiculo: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id CatPartesVehiculoEx', example: 1 })
  idCatPartesVehiculoEx: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id CatTipoDano', example: 1 })
  idCatTipoDano: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id CatGradoSeveridad', example: 1 })
  idCatGradoSeveridad: number;
}
