import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RegistrarTableroBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Kilometraje actual del tablero', example: 45230.5 })
  kilometraje: number;
}
