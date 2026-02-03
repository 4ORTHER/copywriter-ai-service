import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { buildPrompt, parseResponse, getSystemPrompt } from './lib/promptBuilder'
import type { GenerateRequest, GenerationResults } from './types'

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
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
