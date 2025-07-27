import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { CHATGPT_CONFIG } from '../../config/chatgpt'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, guestName } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    const completion = await openai.chat.completions.create({
      model: CHATGPT_CONFIG.model,
      messages: [
        {
          role: "system",
          content: CHATGPT_CONFIG.systemPrompt(guestName)
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: CHATGPT_CONFIG.maxTokens,
      temperature: CHATGPT_CONFIG.temperature,
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response at the moment."

    res.status(200).json({ response })
  } catch (error) {
    console.error('ChatGPT API error:', error)
    res.status(500).json({ error: 'Failed to generate response' })
  }
}