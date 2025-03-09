const axios = require('axios');

/**
 * Claude API Controller
 * 
 * Handles communication with the Claude API for both
 * user-facing and system-level intelligence features.
 */

// Claude API configuration
const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '4000');

// System prompt templates
const USER_FACING_SYSTEM_PROMPT = `You are Claude, a helpful AI assistant embedded in a virtual try-on application for clothing and jewelry.
You can provide style advice, help with the application features, and answer questions about how the technology works.
Your responses should be helpful, friendly, and concise.

## Application Context
- This is a virtual try-on platform for both clothing and jewelry items
- Users can upload photos or use their camera for try-on
- The platform uses AI for clothing warping, 3D jewelry rendering, and size recommendations
- Key features include AR mode, size recommendations, and style assistance

## Response Guidelines
- Keep your responses focused on fashion, styling, and application help
- Provide constructive and personalized style advice when asked
- Explain technical features in simple terms
- Be honest about limitations (e.g., if you can't see the user's try-on results)
- Always maintain a supportive and positive tone when discussing appearance and fit`;

const SYSTEM_INTELLIGENCE_PROMPT = `You are Claude, an AI system assistant analyzing telemetry data and system performance from a virtual try-on application.
Your task is to identify patterns, suggest optimizations, and provide technical insights to improve the system.

## Analysis Guidelines
- Analyze performance metrics objectively and identify bottlenecks
- Suggest concrete optimizations based on the telemetry data
- Prioritize issues by severity and impact on user experience
- Consider device capabilities when making recommendations
- Format your response with clear sections: Summary, Key Issues, Recommendations`;

/**
 * Controller for Claude API communication
 */

// Check Claude API health
exports.pingClaude = async (req, res) => {
  try {
    // Simple ping to check if the Claude API key is valid
    const response = await axios.get(`${CLAUDE_API_BASE_URL}/models`, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Claude API connection successful',
      models: response.data.models
    });
  } catch (error) {
    console.error('Claude API ping error:', error.response?.data || error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Claude API',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// Handle conversation with Claude
exports.conversationWithClaude = async (req, res) => {
  try {
    const { message, conversationHistory = [], context = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }
    
    // Determine if this is a user-facing or system intelligence request
    const isSystemRequest = context.requestType === 'systemTelemetry';
    const systemPrompt = isSystemRequest ? SYSTEM_INTELLIGENCE_PROMPT : USER_FACING_SYSTEM_PROMPT;
    
    // Prepare messages for Claude API
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add context message if needed
    if (Object.keys(context).length > 0) {
      messages.push({
        role: 'user',
        content: `Here is the current context: ${JSON.stringify(context, null, 2)}`
      });
      messages.push({
        role: 'assistant',
        content: 'Thank you for providing the context. I will keep this in mind during our conversation.'
      });
    }
    
    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message
    });
    
    // Call Claude API
    const response = await axios.post(
      `${CLAUDE_API_BASE_URL}/messages`,
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: messages
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract Claude's response
    const claudeResponse = response.data.content[0].text;
    
    res.status(200).json({
      status: 'success',
      response: claudeResponse,
      usage: response.data.usage,
      model: response.data.model
    });
  } catch (error) {
    console.error('Claude API error:', error.response?.data || error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get response from Claude',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// Handle system telemetry analysis
exports.analyzeTelemetry = async (req, res) => {
  try {
    const { telemetryData } = req.body;
    
    if (!telemetryData) {
      return res.status(400).json({
        status: 'error',
        message: 'Telemetry data is required'
      });
    }
    
    // Create system prompt for telemetry analysis
    const message = `Please analyze the following telemetry data from our virtual try-on application and provide insights and optimization recommendations:
    
    ${JSON.stringify(telemetryData, null, 2)}
    
    Focus on:
    1. Performance bottlenecks
    2. Error patterns
    3. User interaction flows
    4. Model loading and execution times
    5. Device-specific issues`;
    
    // Call Claude API with system intelligence prompt
    const response = await axios.post(
      `${CLAUDE_API_BASE_URL}/messages`,
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_INTELLIGENCE_PROMPT },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract Claude's analysis
    const analysisResponse = response.data.content[0].text;
    
    res.status(200).json({
      status: 'success',
      analysis: analysisResponse,
      usage: response.data.usage,
      model: response.data.model
    });
  } catch (error) {
    console.error('Claude telemetry analysis error:', error.response?.data || error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze telemetry with Claude',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// Get style advice
exports.getStyleAdvice = async (req, res) => {
  try {
    const { item, userPreferences } = req.body;
    
    if (!item) {
      return res.status(400).json({
        status: 'error',
        message: 'Item details are required'
      });
    }
    
    // Create prompt for style advice
    const message = `I need style advice for this ${item.type}: ${JSON.stringify(item)}. 
    ${userPreferences ? `My style preferences are: ${JSON.stringify(userPreferences)}` : ''}
    
    Please provide:
    1. How to style this item
    2. What occasions it would be appropriate for
    3. Complementary items or accessories
    4. Any specific styling tips`;
    
    // Call Claude API
    const response = await axios.post(
      `${CLAUDE_API_BASE_URL}/messages`,
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: USER_FACING_SYSTEM_PROMPT },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract Claude's style advice
    const styleAdvice = response.data.content[0].text;
    
    res.status(200).json({
      status: 'success',
      advice: styleAdvice,
      usage: response.data.usage,
      model: response.data.model
    });
  } catch (error) {
    console.error('Claude style advice error:', error.response?.data || error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get style advice from Claude',
      error: error.response?.data?.error?.message || error.message
    });
  }
};