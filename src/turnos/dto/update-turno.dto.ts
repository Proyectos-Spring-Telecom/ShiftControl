import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateTurnoDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Id del turno a cerrar (debe coincidir con el id de la ruta)',
    example: 1,
  })
  idTurno: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Latitud de cierre (LatitudCierre)', example: 19.4326077 })
  latitud: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Longitud de cierre (LongitudCierre)', example: -99.133208 })
  longitud: number;
}
