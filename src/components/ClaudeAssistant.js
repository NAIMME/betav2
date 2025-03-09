import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  Chip, 
  Paper,
  CircularProgress,
  Divider,
  Avatar
} from '@mui/material';
import { Send as SendIcon, Refresh as RefreshIcon, Close as CloseIcon } from '@mui/icons-material';
import claudeService from '../utils/ClaudeService';
import ClaudeErrorBoundary from './ClaudeErrorBoundary';
import './ClaudeAssistant.css';

/**
 * ClaudeAssistant Component
 * 
 * A conversational interface powered by Claude AI that provides
 * style advice, product recommendations, and technical assistance.
 */
const ClaudeAssistant = ({
  selectedItem = null,
  userMeasurements = null,
  tryOnResults = null,
  isMinimized = false,
  onToggleMinimize,
  systemContext = {}
}) => {
  // State for conversation
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  
  // Reference for auto-scrolling the conversation
  const messagesEndRef = useRef(null);
  
  // Initialize Claude service with system context
  useEffect(() => {
    const initializeAssistant = async () => {
      try {
        const claudeContext = {
          ...systemContext,
          selectedItem,
          userMeasurements,
          tryOnResults
        };
        
        await claudeService.initialize(claudeContext);
        
        // Add initial welcome message if no messages exist
        if (messages.length === 0) {
          setMessages([
            {
              role: 'assistant',
              content: "Hi there! I'm Claude, your personal styling assistant. How can I help you today? I can provide style advice, recommend jewelry or clothing, or answer questions about your virtual try-on experience."
            }
          ]);
          
          // Generate initial suggested questions
          generateSuggestedQuestions();
        }
      } catch (err) {
        setError('Failed to initialize Claude assistant');
        console.error('Error initializing Claude:', err);
      }
    };
    
    initializeAssistant();
  }, [systemContext]);
  
  // Update Claude context when selected item or results change
  useEffect(() => {
    claudeService.updateSystemContext({
      selectedItem,
      userMeasurements,
      tryOnResults
    });
    
    // Generate new suggestions when context changes
    if (messages.length > 0) {
      generateSuggestedQuestions();
    }
  }, [selectedItem, userMeasurements, tryOnResults]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a message to Claude
  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;
    
    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Get context from current state
      const context = {
        selectedItem,
        userMeasurements,
        tryOnResults,
        ...systemContext
      };
      
      // Send message to Claude
      const response = await claudeService.sendMessage(message, {
        context,
        includeHistory: true  // Include conversation history for context
      });
      
      // Add Claude's response to conversation
      const claudeMessage = {
        role: 'assistant',
        content: response.response
      };
      
      setMessages(prevMessages => [...prevMessages, claudeMessage]);
      
      // Generate new suggested questions
      generateSuggestedQuestions();
    } catch (err) {
      setError('Failed to get response from Claude');
      console.error('Error getting Claude response:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate suggested questions based on conversation
  const generateSuggestedQuestions = async () => {
    try {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const questions = await claudeService.getSuggestedQuestions(lastMessage);
      setSuggestedQuestions(questions);
    } catch (err) {
      console.error('Error generating suggested questions:', err);
      // Fall back to default questions if needed
      setSuggestedQuestions([
        "How should I style this?",
        "What accessories would go well with this?",
        "Can you recommend similar items?"
      ]);
    }
  };
  
  // Handle clicking a suggested question
  const handleSuggestedQuestionClick = (question) => {
    handleSendMessage(question);
  };
  
  // Handle clearing the conversation
  const handleClearConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content: "I've cleared our conversation. How else can I help you today?"
      }
    ]);
    claudeService.clearConversationHistory();
    generateSuggestedQuestions();
  };
  
  // Render message content with basic formatting
  const renderMessageContent = (content) => {
    // Split by newlines and render paragraphs
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph contains a bullet point list
      if (paragraph.includes('- ')) {
        const items = paragraph.split('\n- ');
        return (
          <Box key={index} mb={1}>
            <Typography variant="body1">{items[0]}</Typography>
            <ul>
              {items.slice(1).map((item, i) => (
                <li key={i}>
                  <Typography variant="body1">{item}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        );
      }
      
      return (
        <Typography key={index} variant="body1" paragraph>
          {paragraph}
        </Typography>
      );
    });
  };
  
  // If minimized, show only the header
  if (isMinimized) {
    return (
      <Paper className="claude-assistant-minimized">
        <Box className="claude-header">
          <Avatar alt="Claude" src="/claude-logo.png" className="claude-avatar" />
          <Typography variant="subtitle1">Claude Assistant</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" onClick={onToggleMinimize}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    );
  }
  
  return (
    <ClaudeErrorBoundary>
      <Paper className="claude-assistant-container">
        {/* Header */}
        <Box className="claude-header">
          <Avatar alt="Claude" src="/claude-logo.png" className="claude-avatar" />
          <Typography variant="subtitle1">Claude Assistant</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" onClick={handleClearConversation}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onToggleMinimize}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Divider />
        
        {/* Messages Container */}
        <Box className="messages-container">
          {messages.map((msg, index) => (
            <Box 
              key={index} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'claude-message'}`}
            >
              {renderMessageContent(msg.content)}
            </Box>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <Box className="message claude-message">
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Claude is thinking...
              </Typography>
            </Box>
          )}
          
          {/* Error message */}
          {error && (
            <Box className="message error-message">
              <Typography color="error">{error}</Typography>
              <Button 
                size="small" 
                onClick={() => handleSendMessage(inputMessage)}
                sx={{ mt: 1 }}
              >
                Retry
              </Button>
            </Box>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </Box>
        
        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <Box className="suggested-questions">
            {suggestedQuestions.map((question, index) => (
              <Chip
                key={index}
                label={question}
                onClick={() => handleSuggestedQuestionClick(question)}
                clickable
                className="suggested-question-chip"
              />
            ))}
          </Box>
        )}
        
        {/* Input Box */}
        <Box className="input-container">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask me about styles, jewelry, or how to use this app..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            size="small"
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <IconButton 
            color="primary" 
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </ClaudeErrorBoundary>
  );
};

export default ClaudeAssistant;