import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCatPartesVehiculoExDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    description: 'Nombre de la parte del vehículo',
    example: 'Capó',
  })
  nombre: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Id de CatVistaVehiculo (vista exterior asociada)',
    example: 2,
  })
  idVistaVehiculo: number;
}
