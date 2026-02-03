# Implementation Plan - OpenAI Backend Service

Build a backend API service to handle OpenAI text generation for the Figma plugin.

## Current State

- **No `src/lib/openai.ts`** - deleted
- **No `src/lib/promptBuilder.ts`** - deleted
- **`ConfigScreen.tsx`** has a TODO placeholder at line 77 that needs implementation
- **No `.env` files** - API URL will be hardcoded

---

## Part 1: Create Backend Service

### 1.1 Directory Structure

```
server/
├── src/
│   ├── app.ts              # Express server
│   ├── types.ts            # Type definitions
│   └── lib/
│       └── promptBuilder.ts # Prompt construction
├── package.json
├── tsconfig.json
└── .gitignore
```

### 1.2 `server/package.json`

```json
{
  "name": "copywriter-api",
  "version": "1.0.0",
  "main": "dist/app.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "ts-node src/app.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "openai": "^4.24.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### 1.3 `server/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 `server/.gitignore`

```
node_modules
dist
.env
```

### 1.5 `server/src/types.ts`

```typescript
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
```

### 1.6 `server/src/lib/promptBuilder.ts`

```typescript
import type { GenerationConfig, ScannedTextNode, GenerationResults } from '../types.js'

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
```

### 1.7 `server/src/app.ts`

```typescript
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { buildPrompt, parseResponse, getSystemPrompt } from './lib/promptBuilder.js'
import type { GenerateRequest, GenerationResults } from './types.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: true, methods: ['POST', 'GET', 'OPTIONS'] }))

// Rate limit: 100 requests per 15 minutes per IP
app.use('/generate', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.post('/generate', async (req, res) => {
  try {
    const { config, nodes } = req.body as GenerateRequest

    if (!config || !nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ error: 'Invalid request: config and nodes required' })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: buildPrompt(config, nodes) }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return res.status(500).json({ error: 'Empty response from OpenAI' })
    }

    const results: GenerationResults = parseResponse(content, nodes)
    return res.json(results)
  } catch (error) {
    console.error('Generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

---

## Part 2: Update Client

### 2.1 Create `src/lib/api.ts`

Create a new file for API calls:

```typescript
// API client for backend service

import type { GenerationConfig, ScannedTextNode, GenerationResults, BatchProgress } from './messageTypes'

// TODO: Replace with your deployed server URL
const API_URL = 'https://your-server.com'

const BATCH_SIZE = 10

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export async function generateVariants(
  config: GenerationConfig,
  nodes: ScannedTextNode[],
  signal?: AbortSignal,
  onProgress?: (progress: BatchProgress) => void
): Promise<GenerationResults> {
  if (nodes.length <= BATCH_SIZE) {
    onProgress?.({ current: 1, total: 1 })
    return generateBatch(config, nodes, signal)
  }

  const batches = chunkArray(nodes, BATCH_SIZE)
  const allResults: GenerationResults = { variants: [] }

  for (let i = 0; i < batches.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    onProgress?.({ current: i + 1, total: batches.length })

    try {
      const batchResults = await generateBatch(config, batches[i], signal)
      allResults.variants.push(...batchResults.variants)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`Batch ${i + 1}/${batches.length} failed: ${msg}`)
    }
  }

  return allResults
}

async function generateBatch(
  config: GenerationConfig,
  nodes: ScannedTextNode[],
  signal?: AbortSignal
): Promise<GenerationResults> {
  const response = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ config, nodes })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(data.error || `API error: ${response.status}`)
  }

  return response.json()
}
```

### 2.2 Update `src/ui/components/ConfigScreen.tsx`

Add import at top:

```typescript
import { generateVariants } from '@/lib/api'
```

Replace the `handleGenerate` function (around line 67-95):

```typescript
const handleGenerate = useCallback(async () => {
  try {
    if (scannedNodes.length === 0) {
      alert(th.config.alerts.noTextNodesFound)
      return
    }

    onGenerationStatusChange('generating')

    const results = await generateVariants(localConfig, scannedNodes, abortSignal, onProgress)
    onGenerationComplete(results)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (isTimeoutAbort?.()) {
        console.log('Generation aborted due to timeout')
        return
      }
      console.log('Generation aborted by user')
      onGenerationAbort?.()
      return
    }

    console.error('Generation error:', error)
    onGenerationError(error as Error)
  }
}, [scannedNodes, localConfig, abortSignal, onGenerationStatusChange, onGenerationComplete, onGenerationError, onGenerationAbort, isTimeoutAbort, onProgress])
```

---

## Part 3: Deployment

### Server Deployment (Render/Railway/Heroku)

1. Push `server/` to a Git repository
2. Create new web service on your platform
3. Set environment variable: `OPENAI_API_KEY=sk-...`
4. Deploy

### Client Update

Update `API_URL` in `src/lib/api.ts` to your deployed server URL.

---

## Verification Checklist

- [ ] Server starts: `cd server && npm install && npm run dev`
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Client builds: `npm run build`
- [ ] Plugin loads in Figma
- [ ] Generation works (requests go to your server, not OpenAI directly)
- [ ] Cancellation works
- [ ] Error handling works (stop server mid-request)
