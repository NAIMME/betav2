/**
 * ClaudeService.js
 * 
 * Utility class for handling interactions with the Claude API,
 * including both user-facing and system-level intelligence features.
 */

class ClaudeService {
    constructor() {
      this.baseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      this.isInitialized = false;
      this.systemContext = {};
      this.conversationHistory = [];
    }
    
    /**
     * Initialize the Claude service with system context
     * 
     * @param {Object} context System context information
     */
    async initialize(context = {}) {
      try {
        this.systemContext = {
          appVersion: context.appVersion || '1.0.0',
          deviceCapabilities: context.deviceCapabilities || {},
          userPreferences: context.userPreferences || {},
          ...context
        };
        
        // Optional: Ping API to ensure connection
        const response = await fetch(`${this.baseUrl}/claude/ping`);
        if (!response.ok) {
          throw new Error('Failed to connect to Claude API');
        }
        
        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error('Error initializing Claude service:', error);
        return false;
      }
    }
    
    /**
     * Send a user message to Claude and get a response
     * 
     * @param {String} message User's message
     * @param {Object} options Additional options
     * @returns {Object} Claude's response
     */
    async sendMessage(message, options = {}) {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      try {
        const payload = {
          message,
          conversationHistory: options.includeHistory ? this.conversationHistory : [],
          context: {
            ...this.systemContext,
            ...options.context
          }
        };
        
        const response = await fetch(`${this.baseUrl}/claude/conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Error from Claude API: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add to conversation history if enabled
        if (options.updateHistory !== false) {
          this.conversationHistory.push({
            role: 'user',
            content: message
          });
          
          this.conversationHistory.push({
            role: 'assistant',
            content: data.response
          });
        }
        
        return data;
      } catch (error) {
        console.error('Error sending message to Claude:', error);
        throw error;
      }
    }
    
    /**
     * Get style advice for a specific item or combination
     * 
     * @param {Object} item Item data
     * @param {String} userContext Additional context from user
     * @returns {Object} Style advice
     */
    async getStyleAdvice(item, userContext = '') {
      try {
        const itemType = item.type || 'clothing';
        const context = {
          requestType: 'styleAdvice',
          itemType,
          itemDetails: item
        };
        
        const message = `I'm looking for style advice about this ${itemType}: ${JSON.stringify(item)}. ${userContext}`;
        
        return await this.sendMessage(message, { 
          context,
          updateHistory: false // Don't add to main conversation
        });
      } catch (error) {
        console.error('Error getting style advice:', error);
        throw error;
      }
    }
    
    /**
     * Get sizing recommendations based on measurements
     * 
     * @param {Object} measurements User measurements
     * @param {Object} item Item to get sizing for
     * @returns {Object} Size recommendations
     */
    async getSizeRecommendation(measurements, item) {
      try {
        const context = {
          requestType: 'sizeRecommendation',
          measurements,
          itemDetails: item
        };
        
        const message = `Please recommend the best size for me based on these measurements: ${JSON.stringify(measurements)}`;
        
        return await this.sendMessage(message, {
          context,
          updateHistory: false
        });
      } catch (error) {
        console.error('Error getting size recommendation:', error);
        throw error;
      }
    }
    
    /**
     * Send system telemetry data to Claude for analysis
     * 
     * @param {Object} telemetryData System telemetry data
     * @returns {Object} Analysis and recommendations
     */
    async analyzeTelemetry(telemetryData) {
      try {
        const context = {
          requestType: 'systemTelemetry',
          telemetryData
        };
        
        const message = `Please analyze this system telemetry data and provide recommendations: ${JSON.stringify(telemetryData)}`;
        
        return await this.sendMessage(message, {
          context,
          updateHistory: false
        });
      } catch (error) {
        console.error('Error analyzing telemetry:', error);
        throw error;
      }
    }
    
    /**
     * Get suggested questions based on current context
     * 
     * @param {String} currentContext Current conversation context
     * @param {Number} count Number of suggestions to return
     * @returns {Array} Suggested questions
     */
    async getSuggestedQuestions(currentContext, count = 3) {
      try {
        const context = {
          requestType: 'suggestedQuestions',
          currentContext,
          count
        };
        
        const message = `Based on our conversation, what might I want to ask next? Please generate ${count} potential questions.`;
        
        const response = await this.sendMessage(message, {
          context,
          updateHistory: false
        });
        
        // Parse the response to extract questions
        // This assumes the response format is consistent
        const questions = response.response
          .split('\n')
          .filter(line => line.trim().length > 0)
          .slice(0, count);
        
        return questions;
      } catch (error) {
        console.error('Error getting suggested questions:', error);
        return [
          "What other styles would look good on me?",
          "How should I accessorize this outfit?",
          "Do you have recommendations for similar items?"
        ]; // Fallback suggestions
      }
    }
    
    /**
     * Clear the conversation history
     */
    clearConversationHistory() {
      this.conversationHistory = [];
    }
    
    /**
     * Update system context
     * 
     * @param {Object} newContext Updated context information
     */
    updateSystemContext(newContext) {
      this.systemContext = {
        ...this.systemContext,
        ...newContext
      };
    }
  }
  
  // Export as singleton
  const claudeService = new ClaudeService();
  export default claudeService;