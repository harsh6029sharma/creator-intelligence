import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export interface ClassificationResult {
  label: 'toxic' | 'spam' | 'safe'
  confidence: number
  reason: string
}


export const classifyComment = async (text: string): Promise<ClassificationResult> => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `You are a strict comment moderation AI. Classify the following YouTube comment.

Respond ONLY in this exact JSON format, nothing else:
{
  "label": "toxic" | "spam" | "safe",
  "confidence": 0.0 to 1.0,
  "reason": "one line explanation"
}

Rules:
- toxic: ONLY hate speech, slurs, death threats, severe personal attacks. Confidence > 0.9 only for explicit hate/slurs.
- spam: promotional links, repeated text, bot-like content, self promotion
- safe: normal comments, mild criticism, questions, compliments, general discussion

IMPORTANT: Most YouTube comments are safe. Be conservative — only mark toxic if clearly harmful. 
For ambiguous comments default to safe with low confidence (0.3-0.5).

Comment: "${text.replace(/"/g, "'")}"`
      }
    ],
    temperature: 0.2,
    max_tokens: 100,
  })

  const raw = response.choices[0]?.message.content ?? '{}'
  const cleaned = raw.replace(/```json|```/g, '').trim()

  try {
    const result = JSON.parse(cleaned) as ClassificationResult

    if (!['toxic', 'spam', 'safe'].includes(result.label)) {
      return { label: 'safe', confidence: 0.5, reason: 'parse error fallback' }
    }

    return result

  } catch {
    return { label: 'safe', confidence: 0.5, reason: 'parse error fallback' }
  }
}