import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { Message, UploadedFile, GitHubLink } from '../types/chat';

const BACKEND_IP = 'localhost';
const API_URL = `http://${BACKEND_IP}:3000`;
const WS_URL = `ws://${BACKEND_IP}:8000`;

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [githubLinks, setGithubLinks] = useState<GitHubLink[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<
    string | null
  >(null);
  const [isRewriteMode, setIsRewriteMode] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const currentStreamingMessageIdRef = useRef<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'file' | 'github';
  } | null>(null);


  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}?clientId=web-client-${Date.now()}`);
    wsRef.current = socket;
    setConnectionStatus('connecting');

    socket.onopen = () => {
      setConnectionStatus('connected');
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('WebSocket disconnected');
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setConnectionStatus('disconnected');
    };

    return () => socket.close();
  }, []);

useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const docsResponse = await axios.get(`${API_URL}/meta/doc`);
        if (docsResponse.data) {
          const fetchedFiles: UploadedFile[] = docsResponse.data.map((doc: any) => ({
            id: doc.uniqueID,
            name: doc.fileName,
            size: doc.fileSize
          }));
          setUploadedFiles(fetchedFiles);
        }
      } catch (error) {
        console.error('Failed to fetch uploaded documents:', error);
      }

      try {
        const reposResponse = await axios.get(`${API_URL}/meta/repo`);
        if (reposResponse.data) {
          const fetchedLinks: GitHubLink[] = reposResponse.data.map((repo: any) => ({
            id: repo.repouniqueid,
            github_url: repo.repoUrl,
            branch: repo.branch,
          }));
          setGithubLinks(fetchedLinks);
        }
      } catch (error) {
        console.error('Failed to fetch github repositories:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.eventtype) {
      case 'stream.start':
        {
          const messageId = Date.now().toString();
          setCurrentStreamingMessageId(messageId);
          currentStreamingMessageIdRef.current = messageId;
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              content: '',
              sender: 'ai',
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
          setIsStreaming(true);
        }
        break;

      case 'stream.chunk':
        {
          const id = currentStreamingMessageIdRef.current;
          if (id) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages];
              const streamingMessageIndex = newMessages.findIndex(
                (msg) => msg.id === id,
              );
              if (streamingMessageIndex !== -1) {
                newMessages[streamingMessageIndex] = {
                  ...newMessages[streamingMessageIndex],
                  content:
                    newMessages[streamingMessageIndex].content +
                    data.payload.message,
                };
              }
              return newMessages;
            });
          }
        }
        break;

      case 'stream.end':
        {
          const endId = currentStreamingMessageIdRef.current;
          setIsStreaming(false);
          if (endId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === endId ? { ...msg, isStreaming: false } : msg,
              ),
            );
            setCurrentStreamingMessageId(null);
            currentStreamingMessageIdRef.current = null;
          }
        }
        break;

      case 'stream.error':
        console.error('Backend error:', data.payload?.message);
        break;

      default:
        console.warn('Unknown WebSocket eventtype:', data.eventtype);
    }
  };

  const sendEvent = (eventtype: string, payload: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ eventtype, payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  const handleSendMessage = (content: string) => {
    const messageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content,
        sender: 'user',
        timestamp: new Date(),
      },
    ]);
    sendEvent('websocket.stream', { message: content });
  };

  const handleUploadFiles = async (attachments: { file: File; metadata: { [key: string]: string } }[]) => {
    const formData = new FormData();

    // Collect all metadata objects into a single array.
    const metadataArray = attachments.map(a => a.metadata);

    // Append each file to the 'files' key.
    attachments.forEach(({ file }) => {
      formData.append('files', file);
    });

    // Append the entire metadata array as a single JSON string.
    // The backend MUST parse this string to get the array of objects.
    formData.append('metadata', JSON.stringify(metadataArray));

    try {
      const { data } = await axios.post(`${API_URL}/upload_docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          console.log(`Uploading files: ${percent}%`);
        },
      });


      const uploaded: UploadedFile[] = data.processedFiles.map((doc: any) => {
        return {
          id: doc.docUniqueId,
          name: doc.fileName,
        };
      });
      setUploadedFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const handleSubmitGithubUrl = async (url: string, branch: string) => {
    const newLink: GitHubLink = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      github_url: url,
      branch,
    };
    setGithubLinks((prev) => [...prev, newLink]);

    try {
      await axios.post(`${API_URL}/upload_github`, newLink);
    } catch (err) {
      console.error('GitHub link upload failed:', err);
    }
  };

  const handleStopChat = () => {
    sendEvent('websocket.stream.stop');
    setIsStreaming(false);
    setCurrentStreamingMessageId(null);
  };

  const handleStopAndRewrite = () => {
    handleStopChat();

    if (currentStreamingMessageId) {
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== currentStreamingMessageId),
      );
    }

    const lastUserMsg = [...messages]
      .reverse()
      .find((msg) => msg.sender === 'user');
    if (lastUserMsg) {
      setLastUserMessage(lastUserMsg.content);
      setIsRewriteMode(true);
    }
  };

  const handleUpdatePrompt = async (newContent: string) => {
    try {
      await axios.post(`${API_URL}/prompt/update`, {
        message: newContent,
      });
    } catch (err) {
      console.error('Prompt update failed:', err);
    }

    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.sender === 'user');
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const updated = [...prev];
      updated[realIdx] = {
        ...updated[realIdx],
        content: newContent,
        timestamp: new Date(),
      };
      return updated.slice(0, realIdx + 1);
    });
  };

  const handleRewritePrompt = (newContent: string) => {
    handleUpdatePrompt(newContent);
    sendEvent('websocket.stream', { message: newContent });
    setIsRewriteMode(false);
    setLastUserMessage('');
  };

  const handleDeleteFile = (fileId: string) => {
    setItemToDelete({ id: fileId, type: 'file' });
  };

  const handleDeleteGithubLink = (linkId: string) => {
    setItemToDelete({ id: linkId, type: 'github' });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { id, type } = itemToDelete;

    try {
      if (type === 'file') {
        const response = await axios.delete(`${API_URL}/doc/${id}`);
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
        alert(response.data.message || 'File deleted successfully.');
      } else if (type === 'github') {
        const response = await axios.delete(`${API_URL}/github_links/${id}`);
        setGithubLinks((prev) => prev.filter((l) => l.id !== id));
        alert(response.data.message || 'GitHub link deleted successfully.');
      }
    } catch (err: any) {
      console.error(`${type} deletion failed:`, err);
      alert(err.response?.data?.message || `Failed to delete ${type}.`);
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <ChatHeader
        connectionStatus={connectionStatus}
        uploadedFiles={uploadedFiles}
        githubLinks={githubLinks}
        onDeleteFile={handleDeleteFile}
        onDeleteGithubLink={handleDeleteGithubLink}
      />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput
        onSendMessage={handleSendMessage}
        onUploadFiles={handleUploadFiles}
        onSubmitGithubUrl={handleSubmitGithubUrl}
        onStopChat={handleStopChat}
        onStopAndRewrite={handleStopAndRewrite}
        onUpdatePrompt={handleUpdatePrompt}
        onRewritePrompt={handleRewritePrompt}
        disabled={connectionStatus !== 'connected'}
        isStreaming={isStreaming}
        isRewriteMode={isRewriteMode}
        lastUserMessage={lastUserMessage}
      />
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} and remove its data from the vector database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatContainer;

