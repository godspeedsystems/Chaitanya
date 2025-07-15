import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Github, Send, X, Square, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onUploadFiles: (attachments: { file: File; metadata: { [key: string]: string } }[]) => Promise<void>;
  onSubmitGithubUrl: (githubUrl: string, branch: string) => void;
  onStopChat: () => void;
  onStopAndRewrite: () => void;
  onUpdatePrompt: (content: string) => void;
  onRewritePrompt: (content: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isRewriteMode?: boolean;
  lastUserMessage?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFiles,
  onSubmitGithubUrl,
  onStopChat,
  onStopAndRewrite,
  onUpdatePrompt,
  onRewritePrompt,
  disabled = false,
  isStreaming = false,
  isRewriteMode = false,
  lastUserMessage = "",
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{ file: File; metadata: { [key: string]: string } }[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubbranch, setGithubbranch] = useState("");
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [tempMetadata, setTempMetadata] = useState<{ [key: string]: string }>({});
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isRewriteMode && lastUserMessage) {
      setMessage(lastUserMessage);
      textareaRef.current?.focus();
    }
  }, [isRewriteMode, lastUserMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (isRewriteMode) {
      onRewritePrompt(message.trim());
    } else if (isUpdatingPrompt) {
      onUpdatePrompt(message.trim());
      setIsUpdatingPrompt(false);
    } else {
      onSendMessage(message.trim());
    }

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newAttachments = files.map(file => ({ file, metadata: {} }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  const handleTempMetadataChange = (oldKey: string, newKey: string, value: string) => {
    setTempMetadata(prev => {
      const newMetadata = { ...prev };
      if (oldKey !== newKey) {
        delete newMetadata[oldKey];
      }
      newMetadata[newKey] = value;
      return newMetadata;
    });
  };

  const addTempMetadataField = () => {
    setTempMetadata(prev => ({ ...prev, '': '' }));
  };

  const removeTempMetadataField = (key: string) => {
    setTempMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[key];
      return newMetadata;
    });
  };

  const handleOpenPopover = (index: number) => {
    setActiveFileIndex(index);
    setTempMetadata(attachments[index].metadata);
    setIsPopoverOpen(true);
  };

  const handleSaveMetadata = () => {
    if (activeFileIndex !== null) {
      setAttachments(prev => {
        const newAttachments = [...prev];
        newAttachments[activeFileIndex].metadata = tempMetadata;
        return newAttachments;
      });
    }
    setActiveFileIndex(null);
    setIsPopoverOpen(false);
  };

  const handleUploadClick = () => {
    onUploadFiles(attachments).then(() => {
      setAttachments([]);
    });
  };

  const handleGithubSubmit = () => {
    if (githubUrl.trim()) {
      onSubmitGithubUrl(githubUrl.trim() , githubbranch?.trim() || 'main');
      setGithubUrl("");
      setGithubbranch("");
      setShowGithubInput(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="border-t border-gray-200 bg-white fixed bottom-0 inset-x-0">
        <div className="w-full max-w-none mx-auto p-3 sm:p-4 md:p-6">
        {isRewriteMode && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Rewrite mode: Edit your prompt
              </span>
            </div>
          </div>
        )}

        {isUpdatingPrompt && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                Update mode: Your next message will replace the last prompt
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUpdatingPrompt(false)}
              >
                <X className="w-4 h-4 text-yellow-600" />
              </Button>
            </div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="p-2 border rounded-md w-full">
                <div className="flex items-center space-x-2">
                  <Upload className="w-3 h-3" />
                  <span>{attachment.file.name}</span>
                  <span className="text-gray-500">
                    ({formatFileSize(attachment.file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <Popover open={isPopoverOpen && activeFileIndex === index} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => handleOpenPopover(index)}>Manage Metadata</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-6">
                    <div className="grid gap-4">
                      <div className="space-y-2 text-center">
                        <h4 className="font-medium leading-none">Metadata</h4>
                        <p className="text-sm text-muted-foreground">
                          Add key-value pairs for {attachment.file.name}
                        </p>
                      </div>
                      <div className="grid gap-2 max-h-60 overflow-y-auto p-1">
                        {Object.entries(tempMetadata).map(([key, value], metaIndex) => (
                          <div key={metaIndex} className="grid grid-cols-3 items-center gap-2">
                            <Input
                              placeholder="Key"
                              value={key}
                              onChange={(e) => handleTempMetadataChange(key, e.target.value, value)}
                              className="col-span-1 h-10"
                            />
                            <Input
                              placeholder="Value"
                              value={value}
                              onChange={(e) => handleTempMetadataChange(key, key, e.target.value)}
                              className="col-span-1 h-10"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTempMetadataField(key)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addTempMetadataField}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveMetadata}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
            {attachments.length > 0 && (
              <Button onClick={handleUploadClick} className="mt-2">
                Upload Files
              </Button>
            )}
          </div>
        )}

        {showGithubInput && (
          <div className="mb-3 flex items-center space-x-2">
            <Github className="w-4 h-4 text-gray-500" />
            <Input
              type="url"
              placeholder="GitHub repository URL"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="flex-1"
            />
            <Input
              type="string"
              placeholder="branch"
              value={githubbranch}
              onChange={(e) => setGithubbranch(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleGithubSubmit}
              disabled={!githubUrl.trim() && !githubbranch.trim()}
            >
              Submit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGithubInput(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4"
        >
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="min-h-[60px] max-h-32 resize-none"
          />

          <div className="flex items-center space-x-2">
            {isStreaming && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStopAndRewrite}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStopChat}
                >
                  <Square className="w-4 h-4" />
                </Button>
              </>
            )}


            {!isRewriteMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.xlsx"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload documents</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGithubInput(!showGithubInput)}
                      className={
                        showGithubInput ? "bg-blue-50 text-blue-600" : ""
                      }
                    >
                      <Github className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Submit GitHub link</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            <Button
              type="submit"
              disabled={disabled || !message.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              <Send className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">
                {isRewriteMode ? "Rewrite" : "Send"}
              </span>
            </Button>
          </div>
        </form>

        <div className="mt-2 text-xs text-gray-500 text-center">
          {disabled
            ? "Connecting to server..."
            : isRewriteMode
            ? "Press Enter to rewrite and stream again"
            : isUpdatingPrompt
            ? "Press Enter to update prompt"
            : "Press Enter to send, Shift+Enter for new line"}
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ChatInput;
