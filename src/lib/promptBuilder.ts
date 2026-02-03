import type { GenerationConfig, ScannedTextNode, GenerationResults } from '../types'

export function buildPrompt(config: GenerationConfig, nodes: ScannedTextNode[]): string {
  const identity = config.identity || 'General professional Thai (สุภาพทั่วไป)'
  const audience = config.targetAudience || 'General users'
  const particles = config.politeParticles ? 'Yes, add appropriately' : 'No'
  const lengthConstraint = getLengthConstraintDescription(config.lengthConstraint)

  const textsSection = nodes
    .map((node, i) => `${i + 1}. [Node: ${node.name}, ID: ${node.id}] "${node.characters}"`)
    .join('\n')

  return `Generate Thai text variants with the following profile:

**Identity/Mood:** ${identity}
**Target Audience:** ${audience}
**Polite Particles (Ka/Krub):** ${particles}
**Length Constraint:** ${lengthConstraint}

**Original texts to rewrite:**
${textsSection}

Generate exactly 3 distinct variants for EACH text above. Each variant should:
- Match the specified Identity/Mood tone and style
- Be appropriate for the Target Audience
- Follow the length constraint guidelines
- Include polite particles if requested
- Be meaningfully different from each other

Return ONLY the JSON response with this exact format:
{
  "variants": [
    {
      "nodeId": "node-id-here",
      "options": ["variant1", "variant2", "variant3"]
    }
  ]
}`
}

function getLengthConstraintDescription(constraint: 'flexible' | 'similar' | 'exact'): string {
  switch (constraint) {
    case 'flexible': return 'Flexible (natural length, no strict limit)'
    case 'similar': return 'Similar length (±10% of original character count)'
    case 'exact': return 'Exact length (match original character count as closely as possible)'
    default: return 'Flexible'
  }
}

export function parseResponse(content: string, nodes: ScannedTextNode[]): GenerationResults {
  try {
    const parsed = JSON.parse(content)
    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      throw new Error('Invalid response format')
    }

    const results: GenerationResults = {
      variants: parsed.variants.map((v: any) => ({
        nodeId: v.nodeId,
        original: nodes.find(n => n.id === v.nodeId)?.characters || '',
        options: v.options || []
      }))
    }

    // Add fallback for missing nodes
    const missingNodes = nodes.filter(
      node => !results.variants.some(v => v.nodeId === node.id)
    )
    missingNodes.forEach(node => {
      results.variants.push({
        nodeId: node.id,
        original: node.characters,
        options: [node.characters, node.characters, node.characters]
      })
    })

    return results
  } catch (error) {
    // Fallback: return original text as all 3 variants
    return {
      variants: nodes.map(node => ({
        nodeId: node.id,
        original: node.characters,
        options: [node.characters, node.characters, node.characters]
      }))
    }
  }
}

export function getSystemPrompt(): string {
  return `You are an expert Thai UX copywriter with deep knowledge of Thai language nuances, tone, and cultural context.

Your task is to generate Thai text variants based on specific Identity/Mood profiles provided by the user.

Key Rules:
1. Thai text has NO SPACES between words - write naturally flowing Thai
2. Respect polite particles (ครับ/ค่ะ/นะ) when requested
3. Match the identity/mood precisely (formal, casual, sarcastic, luxury, Gen Z, etc.)
4. Preserve any variables in curly braces (e.g., {userName}) EXACTLY as they appear
5. Generate exactly 3 distinct variants for each text
6. Each variant should be meaningfully different while matching the same identity/mood
7. Consider the target audience when choosing words and tone
8. Return ONLY valid JSON, no additional text

Output format:
{
  "variants": [
    {
      "nodeId": "123:456",
      "options": ["variant1", "variant2", "variant3"]
    }
  ]
}`
}
