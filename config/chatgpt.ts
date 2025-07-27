export const CHATGPT_CONFIG = {
    // OpenAI model to use
    model: 'gpt-4.1-mini',
    
    // Maximum tokens for response
    maxTokens: 150,
    
    // Temperature for response creativity (0.0 = very focused, 1.0 = very creative)
    temperature: 0.7,
    
    // System prompt template
    systemPrompt: (guestName: string) => 
      `You are a helpful AI assistant in a chat room. A guest named "${guestName || 'Guest'}" is asking you questions. Respond in a friendly, helpful manner. Keep your responses concise but informative. You can help with general questions, provide information, or just have a casual conversation.`,
    
    // Response delay settings (in milliseconds)
    minDelay: 1000,  // Minimum delay before AI responds
    maxDelay: 3000,  // Maximum delay before AI responds
    
    // AI assistant name
    assistantName: 'AI Assistant'
  } 