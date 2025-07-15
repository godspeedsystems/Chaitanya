import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Message } from '../types/chat';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    let frameId: number;

    if (messagesEndRef.current) {
      frameId = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); // "auto" is more stable during stream
      });
    }

    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  return (
    <div className="flex-1 relative pb-[132px]">
      <div className="space-y-6 max-w-7xl mx-auto">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
