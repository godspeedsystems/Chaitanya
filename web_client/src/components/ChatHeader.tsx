import React from "react";
import { Badge } from "@/components/ui/badge";
import SystemPrompt from "./SystemPrompt";
import UploadedItemsPanel from "./UploadedItemsPanel";
import { UploadedFile, GitHubLink } from "../types/chat";

interface ChatHeaderProps {
  connectionStatus: "connected" | "disconnected" | "connecting";
  uploadedFiles: UploadedFile[];
  githubLinks: GitHubLink[];
  onDeleteFile: (fileId: string) => void;
  onDeleteGithubLink: (linkId: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  uploadedFiles,
  githubLinks,
  onDeleteFile,
  onDeleteGithubLink,
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-14 sm:h-16 border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 py-4 z-10">
      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
          AI Chat Assistant
        </h1>
        <Badge
          variant="outline"
          className="flex items-center space-x-1 sm:space-x-2 shrink-0"
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs hidden sm:inline">{getStatusText()}</span>
          <span className="text-xs sm:hidden">
            {connectionStatus === "connected"
              ? "●"
              : connectionStatus === "connecting"
              ? "◐"
              : "○"}
          </span>
        </Badge>
      </div>
      <div className="flex items-center space-x-2">
        <UploadedItemsPanel
          uploadedFiles={uploadedFiles}
          githubLinks={githubLinks}
          onDeleteFile={onDeleteFile}
          onDeleteGithubLink={onDeleteGithubLink}
        />
        <SystemPrompt />
      </div>
    </div>
  );
};

export default ChatHeader;
