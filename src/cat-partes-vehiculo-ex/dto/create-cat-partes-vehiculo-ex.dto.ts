import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCatPartesVehiculoExDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    description: 'Nombre de la parte del vehículo',
    example: 'Parachoques delantero',
  })
  nombre: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Id de CatVistaVehiculo (vista exterior asociada)',
    example: 1,
  })
  idVistaVehiculo: number;
}
