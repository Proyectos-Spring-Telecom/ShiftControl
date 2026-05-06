import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';

/**
 * Body para `POST …/api/auth/validateFace` (proxy BFF → Next).
 * El cliente no envía credenciales BehaviorIQ; solo el embedding y ubicación opcional.
 */
export class ValidateFaceDto {
  @ApiProperty({
    description:
      'Embedding ArcFace (típicamente 512 floats). Se obtiene vía BehaviorIQ (p. ej. embed).',
    type: [Number],
    example: [0.01, -0.02],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  embeddings: number[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitud?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitud?: number;
}
