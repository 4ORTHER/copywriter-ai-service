# Copywriter AI Service - API Documentation

A REST API service for generating Thai UX copywriting variants powered by AI.

## Base URL

```
https://copywriter-ai-service.onrender.com
```

## Authentication

Currently, no authentication is required. Rate limiting is applied per IP address.

---

## Endpoints

### Health Check

Check if the service is running.

```
GET /health
```

**Response**

```json
{
  "status": "ok"
}
```

---

### Generate Text Variants

Generate Thai text variants based on the provided configuration and text nodes.

```
POST /generate
```

**Headers**

| Header         | Value              | Required |
|----------------|-------------------|----------|
| Content-Type   | application/json  | Yes      |

**Request Body**

| Field   | Type               | Required | Description                          |
|---------|--------------------|----------|--------------------------------------|
| config  | GenerationConfig   | Yes      | Configuration for text generation    |
| nodes   | ScannedTextNode[]  | Yes      | Array of text nodes to generate variants for |

#### GenerationConfig

| Field            | Type                                      | Required | Description                                                    |
|------------------|-------------------------------------------|----------|----------------------------------------------------------------|
| identity         | string                                    | Yes      | The tone/mood for generated text (e.g., "Formal Thai", "Casual", "Gen Z slang") |
| targetAudience   | string                                    | Yes      | Target audience description (e.g., "Young professionals", "General users") |
| politeParticles  | boolean                                   | Yes      | Whether to include Thai polite particles (ครับ/ค่ะ/นะ)         |
| lengthConstraint | `"flexible"` \| `"similar"` \| `"exact"` | Yes      | Length constraint for generated variants                       |

**Length Constraint Options:**
- `flexible` - Natural length, no strict limit
- `similar` - Similar length (±10% of original character count)
- `exact` - Match original character count as closely as possible

#### ScannedTextNode

| Field      | Type                                  | Required | Description                              |
|------------|---------------------------------------|----------|------------------------------------------|
| id         | string                                | Yes      | Unique identifier for the text node      |
| name       | string                                | Yes      | Display name of the text node            |
| characters | string                                | Yes      | The original text content                |
| fontName   | `{ family: string; style: string }`   | Yes      | Font information                         |
| path       | string[]                              | Yes      | Path hierarchy of the text node          |

**Example Request**

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
        "id": "123:456",
        "name": "Button Text",
        "characters": "สมัครสมาชิก",
        "fontName": { "family": "Sarabun", "style": "Regular" },
        "path": ["Frame 1", "Button"]
      },
      {
        "id": "123:789",
        "name": "Welcome Message",
        "characters": "ยินดีต้อนรับ",
        "fontName": { "family": "Sarabun", "style": "Bold" },
        "path": ["Frame 1", "Header"]
      }
    ]
  }'
```

**Response**

```json
{
  "variants": [
    {
      "nodeId": "123:456",
      "original": "สมัครสมาชิก",
      "options": [
        "ลงทะเบียนเลยค่ะ",
        "สมัครตอนนี้ค่ะ",
        "เข้าร่วมกับเราค่ะ"
      ]
    },
    {
      "nodeId": "123:789",
      "original": "ยินดีต้อนรับ",
      "options": [
        "สวัสดีค่ะ ยินดีต้อนรับ",
        "ดีใจที่คุณมาค่ะ",
        "ขอต้อนรับค่ะ"
      ]
    }
  ]
}
```

---

## Rate Limiting

The `/generate` endpoint is rate-limited to **100 requests per 15 minutes** per IP address.

When the limit is exceeded, you will receive:

**Status Code:** `429 Too Many Requests`

```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message describing the issue"
}
```

### Common Error Codes

| Status Code | Description                                  |
|-------------|----------------------------------------------|
| 400         | Bad Request - Invalid or missing parameters  |
| 429         | Too Many Requests - Rate limit exceeded      |
| 500         | Internal Server Error - Server-side error    |

### Error Examples

**Missing required fields (400)**

```json
{
  "error": "Invalid request: config and nodes required"
}
```

**Empty AI response (500)**

```json
{
  "error": "Empty response from OpenAI"
}
```

---

## Best Practices

### 1. Batch Requests

Send multiple text nodes in a single request rather than making individual requests for each text. This improves performance and reduces API calls.

```json
{
  "config": { ... },
  "nodes": [
    { "id": "1", ... },
    { "id": "2", ... },
    { "id": "3", ... }
  ]
}
```

### 2. Handle Rate Limits

Implement exponential backoff when you receive a 429 response:

```javascript
async function generateWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.status === 429) {
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      continue;
    }

    return response.json();
  }
  throw new Error('Rate limit exceeded after retries');
}
```

### 3. Preserve Variables

If your text contains variables (e.g., `{userName}`), the API will preserve them in the generated variants. You can safely include templated strings.

### 4. Choose Appropriate Identity/Mood

Common identity/mood options for Thai copywriting:

| Identity               | Use Case                                      |
|------------------------|-----------------------------------------------|
| Formal Thai (สุภาพ)     | Official documents, professional communication |
| Casual Thai            | Social apps, friendly interfaces              |
| Gen Z Thai             | Youth-targeted apps, trendy products          |
| Luxury/Premium         | High-end products, exclusive services         |
| Friendly Professional  | Business apps with approachable tone          |

---

## TypeScript Types

For TypeScript projects, you can use these type definitions:

```typescript
interface GenerationConfig {
  identity: string;
  targetAudience: string;
  politeParticles: boolean;
  lengthConstraint: 'flexible' | 'similar' | 'exact';
}

interface ScannedTextNode {
  id: string;
  name: string;
  characters: string;
  fontName: { family: string; style: string };
  path: string[];
}

interface GenerateRequest {
  config: GenerationConfig;
  nodes: ScannedTextNode[];
}

interface GenerationResults {
  variants: Array<{
    nodeId: string;
    original: string;
    options: string[]; // 3 variants
  }>;
}
```

---

## Example Integration

### JavaScript/TypeScript

```typescript
const API_URL = 'https://copywriter-ai-service.onrender.com';

async function generateVariants(
  config: GenerationConfig,
  nodes: ScannedTextNode[]
): Promise<GenerationResults> {
  const response = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config, nodes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  return response.json();
}

// Usage
const results = await generateVariants(
  {
    identity: 'Friendly and casual Thai',
    targetAudience: 'Young adults',
    politeParticles: true,
    lengthConstraint: 'similar',
  },
  [
    {
      id: 'btn-1',
      name: 'Submit Button',
      characters: 'ส่งข้อมูล',
      fontName: { family: 'Sarabun', style: 'Medium' },
      path: ['Form', 'Button'],
    },
  ]
);

console.log(results.variants[0].options);
// ["ส่งเลยค่ะ", "กดส่งนะคะ", "ส่งข้อมูลค่ะ"]
```

---

## Notes

- The API generates exactly **3 variants** for each text node
- If generation fails for any node, the original text is returned as all 3 variants (fallback behavior)
- Request body size is limited to **1MB**
- CORS is enabled for all origins
