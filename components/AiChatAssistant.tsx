import React, { useState, useRef, useEffect } from 'react';
import type { System, ChatMessage, ToolCallPayload } from '../types';
import { getAiResponse } from '../services/geminiService';
import Button from './common/Button';
import Input from './common/Input';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import LogoIcon from './icons/LogoIcon';
import CheckIcon from './icons/CheckIcon';

interface AiChatAssistantProps {
  systemDocument: System;
  onClose: () => void;
  onSystemUpdate: (updatedDocument: System) => void;
}

const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ systemDocument, onClose, onSystemUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I am your AI system architect. Describe the changes you want to make to your system document. \n\nFor example, try: 'Add a new component named Boiler with core category' or 'Create a diagram node for the new boiler'." }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<ToolCallPayload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || pendingToolCall) return;

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await getAiResponse(systemDocument, newHistory);
      
      const toolCall = response.toolCall;
      if (toolCall?.args?.confirmationMessage) {
        const confirmationMessage = toolCall.args.confirmationMessage;
        setMessages(prev => [...prev, { role: 'model', content: confirmationMessage }]);
        setPendingToolCall(toolCall);
      } else if (response.text) {
        const textResponse = response.text;
        setMessages(prev => [...prev, { role: 'model', content: textResponse }]);
      } else {
         setMessages(prev => [...prev, { role: 'model', content: "Sorry, I received an unexpected response. Please try again." }]);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (!pendingToolCall) return;
    
    const { name, args } = pendingToolCall;
    
    try {
      if (name === 'updateSystem') {
          // The AI might not include these fields, so we preserve them from the original document
          const finalSystem = {
              ...args.updatedSystem,
              id: systemDocument.id,
              created_at: systemDocument.created_at,
          };
          onSystemUpdate(finalSystem);
      } else {
        console.error(`Unknown tool call name: ${name}`);
        throw new Error("Unknown action requested.");
      }
      setMessages(prev => [...prev, { role: 'model', content: "Done. I've updated the system document." }]);
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'model', content: "It looks like there was an error performing that action." }]);
    }

    setPendingToolCall(null);
  };

  const handleCancelAction = () => {
    setMessages(prev => [...prev, { role: 'model', content: "Okay, I've cancelled the request." }]);
    setPendingToolCall(null);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col z-50 border border-emerald-500/30">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-emerald-400" />
            <h3 className="font-semibold text-white">AI Assistant</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <CloseIcon className="h-6 w-6" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <LogoIcon className="h-8 w-8 text-emerald-500 flex-shrink-0 mt-1" />}
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
         {isLoading && (
            <div className="flex items-start gap-3">
                <LogoIcon className="h-8 w-8 text-emerald-500 flex-shrink-0 mt-1 animate-pulse" />
                <div className="max-w-[80%] p-3 rounded-lg bg-slate-700">
                   <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-emerald-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700">
        {pendingToolCall ? (
          <div className="flex justify-center items-center gap-3">
            <Button onClick={handleCancelAction} variant="secondary" className="w-full">
                <CloseIcon className="h-5 w-5 mr-2" /> No, cancel
            </Button>
            <Button onClick={handleConfirmAction} className="w-full">
                <CheckIcon className="h-5 w-5 mr-2" /> Yes, confirm
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input 
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe a change..."
              className="flex-1 !py-2"
              disabled={isLoading}
            />
            <Button type="submit" size="sm" className="!px-3 !py-2" disabled={isLoading || !userInput.trim()}>
              <SendIcon className="h-5 w-5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AiChatAssistant;