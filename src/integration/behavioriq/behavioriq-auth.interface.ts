/**
 * Cuerpo JSON del endpoint POST /auth/login de behaviorIQ
 * (nombres de campos según OpenAPI del servicio externo).
 */
export interface BehaviorIqLoginRequestBody {
  usuario: string;
  contrasena: string;
}

/**
 * Respuesta exitosa de POST /auth/login.
 */
export interface BehaviorIqLoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
}
