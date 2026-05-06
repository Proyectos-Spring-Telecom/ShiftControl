export interface BehaviorIqValidatePoseResponse {
  valid: boolean;
  reason?: string;
}

export interface BehaviorIqEmbedResponse {
  embedding: number[];
}

export interface BehaviorIqLivenessCheckResponse {
  passed: boolean;
  reason?: string;
  score?: number;
}

export interface BehaviorIqCrearRostroResponse {
  success: boolean;
  id?: number;
}
