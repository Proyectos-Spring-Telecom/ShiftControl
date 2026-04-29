import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Acepta JWT en `Authorization: Bearer …` o en `?token=` (útil para abrir PDF en nueva pestaña).
 * Si existe header Authorization, tiene prioridad sobre el query param.
 */
@Injectable()
export class JwtAuthQueryGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; query?: { token?: string } }>();
    const tokenFromQuery = request.query?.token;

    if (tokenFromQuery && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${tokenFromQuery}`;
    }

    return super.canActivate(context);
  }
  
}
