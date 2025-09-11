import React, { useState, useRef, useEffect } from 'react';
import type { DatabaseSchema, ChatMessage, ToolCallPayload, Record, Filter } from '../types';
import { getAiResponse } from '../services/geminiService';
import Button from './common/Button';
import Input from './common/Input';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import LogoIcon from './icons/LogoIcon';
import CheckIcon from './icons/CheckIcon';

interface AiChatAssistantProps {
  tableName: string;
  schema: DatabaseSchema;
  onClose: () => void;
  onCreateRecord: (newRecord: Omit<Record, 'id' | 'created_at'>) => void;
  onUpdateRecord: (recordId: string, updates: Partial<Omit<Record, 'id'>>) => void;
  onDeleteRecord: (recordId: string) => void;
  onSearch: (filters: Filter[]) => void;
}

const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ tableName, schema, onClose, onCreateRecord, onUpdateRecord, onDeleteRecord, onSearch }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `Hello! I can help you manage your "${tableName}" table. \n\nTry asking: 'Find all records where status is complete' or 'Create a new record'.` }
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
      const response = await getAiResponse(tableName, schema, newHistory);
      
      const toolCall = response.toolCall;
      const textResponse = response.text;

      if (toolCall) {
        if (toolCall.name === 'searchRecords') {
            const message = toolCall.args?.responseMessage;
            if (typeof message === 'string' && message) {
                setMessages(prev => [...prev, { role: 'model', content: message }]);
            }
            if (toolCall.args.filters) {
                onSearch(toolCall.args.filters);
            }
        } else {
            const message = toolCall.args?.confirmationMessage;
            if (typeof message === 'string' && message) {
              setMessages(prev => [...prev, { role: 'model', content: message }]);
              setPendingToolCall(toolCall);
            } else {
              setMessages(prev => [...prev, { role: 'model', content: "Sorry, the AI's response was incomplete. Please try again." }]);
            }
        }
      } else if (textResponse) {
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
      switch(name) {
          case 'createRecord':
              if (args.record) {
                onCreateRecord(args.record);
              } else { throw new Error("Missing record data for creation."); }
              break;
          case 'updateRecord':
              if (args.recordId && args.record) {
                onUpdateRecord(args.recordId, args.record);
              } else { throw new Error("Missing record ID or update data."); }
              break;
          case 'deleteRecord':
              if (args.recordId) {
                onDeleteRecord(args.recordId);
              } else { throw new Error("Missing record ID for deletion."); }
              break;
          default:
              // searchRecords is handled directly, so it won't reach here.
              console.error(`Unknown tool call name: ${name}`);
              throw new Error("Unknown action requested.");
      }
      setMessages(prev => [...prev, { role: 'model', content: "Done. I've performed the action." }]);
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