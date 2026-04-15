/** Respuesta de POST /plate/read (behaviorIQ). */
export interface BehaviorIqPlateReadResponse {
  plate_number: string;
  confidence: number;
}
