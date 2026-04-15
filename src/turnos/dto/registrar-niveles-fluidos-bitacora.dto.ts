import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { EstatusEnum } from 'src/common/estatus.enum';

export class RegistrarNivelesFluidosBitacoraDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Id BitacoraVehiculo', example: 1 })
  idBitacoraVehiculo: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Nivel gasolina (0–100 típico)', example: 80 })
  gasolina?: EstatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Nivel aceite', example: 90 })
  aceite?: EstatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Nivel batería', example: 100 })
  bateria?: EstatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Nivel anticongelante', example: 70 })
  anticongelante?: EstatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ description: 'Nivel líquido de frenos', example: 85 })
  liquidoFrenos?: EstatusEnum;
}
