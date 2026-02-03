# Copywriter AI Service

A REST API service that generates Thai UX copywriting variants using OpenAI. Designed to help designers and developers quickly generate alternative text options for UI elements.

## Features

- Generate 3 distinct Thai text variants for each input
- Configurable tone/identity (formal, casual, Gen Z, luxury, etc.)
- Polite particle support (ครับ/ค่ะ/นะ)
- Length constraints (flexible, similar, exact)
- Rate limiting for API protection
- Fallback handling for failed generations

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd copywriter-ai-service

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Environment Variables

| Variable        | Required | Default      | Description                |
|-----------------|----------|--------------|----------------------------|
| OPENAI_API_KEY  | Yes      | -            | Your OpenAI API key        |
| PORT            | No       | 3000         | Server port                |
| OPENAI_MODEL    | No       | gpt-4o-mini  | OpenAI model to use        |

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Usage

### Health Check

```bash
curl https://copywriter-ai-service.onrender.com/health
```

### Generate Variants

```bash
curl -X POST https://copywriter-ai-service.onrender.com/generate \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "identity": "Friendly and professional Thai",
      "targetAudience": "Young professionals",
      "politeParticles": true,
      "lengthConstraint": "similar"
    },
    "nodes": [
      {
        "id": "btn-1",
        "name": "Button",
        "characters": "สมัครสมาชิก",
        "fontName": { "family": "Sarabun", "style": "Regular" },
        "path": ["Frame", "Button"]
      }
    ]
  }'
```

**Response:**

```json
{
  "variants": [
    {
      "nodeId": "btn-1",
      "original": "สมัครสมาชิก",
      "options": [
        "ลงทะเบียนเลยค่ะ",
        "สมัครตอนนี้ค่ะ",
        "เข้าร่วมกับเราค่ะ"
      ]
    }
  ]
}
```

For complete API documentation, see [docs/api-documentation.md](docs/api-documentation.md).

## Project Structure

```
copywriter-ai-service/
├── src/
│   ├── app.ts              # Express server and endpoints
│   ├── types.ts            # TypeScript type definitions
│   └── lib/
│       └── promptBuilder.ts # Prompt construction and response parsing
├── docs/
│   └── api-documentation.md # Full API documentation
├── package.json
└── tsconfig.json
```

## Rate Limits

- `/generate`: 100 requests per 15 minutes per IP

## License

MIT
