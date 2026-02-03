// Types duplicated from client for simplicity

export interface GenerationConfig {
  identity: string
  targetAudience: string
  politeParticles: boolean
  lengthConstraint: 'flexible' | 'similar' | 'exact'
}

export interface ScannedTextNode {
  id: string
  name: string
  characters: string
  fontName: { family: string; style: string }
  path: string[]
}

export interface GenerationResults {
  variants: Array<{
    nodeId: string
    original: string
    options: string[] // 3 variants
  }>
}

export interface GenerateRequest {
  config: GenerationConfig
  nodes: ScannedTextNode[]
}
