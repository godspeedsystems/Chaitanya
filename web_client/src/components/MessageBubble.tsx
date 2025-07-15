import React, { memo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Message } from "../types/chat";

interface MessageBubbleProps {
  message: Message;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-gray-200 px-1 rounded" {...props}>
        {children}
      </code>
    );
  },
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message }) => {
  const isUser = message.sender === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } animate-fade-in`}
    >
      <div className={`${isUser ? "max-w-3xl order-2" : "order-1"}`}>
        <div
          className={`
            px-6 py-4 rounded-2xl shadow-sm
            ${
              isUser
                ? "bg-gray-100 text-gray-900 mr-12 border border-gray-200 ml-12"
                : ""
            }
            ${message.isStreaming ? "animate-pulse" : ""}
          `}
        >
          <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
            <ReactMarkdown
              components={markdownComponents}
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {message.isStreaming && (
            <span className="inline-block w-2 h-5 bg-current opacity-75 animate-pulse ml-1" />
          )}
        </div>
        <div
          className={`text-xs text-gray-500 mt-2 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
