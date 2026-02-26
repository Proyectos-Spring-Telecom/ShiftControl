import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];
    return value === relatedValue;
  }

  defaultMessage() {
    return 'La contraseña y la confirmación deben coincidir';
  }
}

export class LoginAuthResetDto {
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/u, {
    message:
      'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número',
  })
  @ApiProperty({
    description: 'Nueva contraseña (mayúsculas, minúsculas y número)',
    example: 'NuevaPass123',
  })
  passwordNueva: string;

  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria' })
  @Validate(MatchPasswordConstraint, ['passwordNueva'])
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaPass123',
  })
  passwordConfirmacion: string;
}