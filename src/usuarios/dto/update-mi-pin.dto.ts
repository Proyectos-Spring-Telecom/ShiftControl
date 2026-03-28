import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Validate } from 'class-validator';
import { PinValidator } from 'src/common/validators/pin.validator';

export class UpdateMiPinDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{6}|\d{8})$/, {
    message: 'El PIN debe tener exactamente 6 u 8 digitos numericos',
  })
  @Validate(PinValidator)
  @ApiProperty({
    description: 'PIN numerico de 6 u 8 digitos',
    example: '482915',
  })
  pinHash: string;
}
