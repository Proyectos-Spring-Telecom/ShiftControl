import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Validate } from 'class-validator';
import { PinValidator } from 'src/common/validators/pin.validator';

/**
 * Body para proxy `PATCH …/api/usuarios/mi-nip` (NextAPI).
 * `pinHash` es el nombre del campo en Next; el valor es el PIN en claro (Next lo hashea con bcrypt).
 */
export class UpdateMiPinDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{6}|\d{8})$/, {
    message: 'El PIN debe tener exactamente 6 u 8 dígitos numéricos',
  })
  @Validate(PinValidator)
  @ApiProperty({
    description:
      'PIN/NIP en texto plano (6 u 8 dígitos). NextAPI lo hashea y guarda en Usuarios.PinHash; no enviar bcrypt.',
    examples: ['482915', '93746281'],
  })
  pinHash: string;
}
