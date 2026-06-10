import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class ReverseGeocodingQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ description: 'Latitud', example: 19.2826 })
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ description: 'Longitud', example: -99.6557 })
  lon: number;
}
