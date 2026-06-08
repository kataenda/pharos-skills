export interface SkillParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface SkillParameters {
  type: "object";
  properties: Record<string, SkillParameter>;
  required: string[];
}

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Skill<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: SkillParameters;
  execute(params: TParams): Promise<SkillResult<TResult>>;
}
