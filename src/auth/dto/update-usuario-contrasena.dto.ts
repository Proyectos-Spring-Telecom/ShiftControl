import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  Validate,
} from 'class-validator';
import { MatchPasswordConstraint } from 'src/common/validators/match-password.constraint';

/** Body para proxy `PATCH …/api/usuarios/actualizar/contrasena` (NextAPI). */
export class UpdateUsuarioContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  @ApiProperty({
    description: 'Contraseña actual del usuario autenticado',
    example: 'ContraseñaActual1!',
  })
  passwordActual: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*\p{L})(?=.*\d)(?=.*[@$!%*?&.])[^\s]+$/u, {
    message:
      'La contraseña debe contener al menos una letra, un dígito y un símbolo (@$!%*?&.), sin espacios',
  })
  @ApiProperty({
    description:
      'Nueva contraseña (mín. 6 caracteres; letra, dígito y símbolo @$!%*?&.; sin espacios)',
    example: 'NuevaContraseña2@',
    minLength: 6,
  })
  passwordNueva: string;

  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswordConstraint, ['passwordNueva'])
  @ApiProperty({
    description: 'Debe coincidir con passwordNueva',
    example: 'NuevaContraseña2@',
  })
  passwordNuevaConfirmacion: string;
}
