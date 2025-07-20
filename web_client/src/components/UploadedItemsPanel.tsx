import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, FileText, Github, RefreshCw } from 'lucide-react';
import { UploadedFile, GitHubLink } from '../types/chat';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';

interface UploadedItemsPanelProps {
  uploadedFiles: UploadedFile[];
  githubLinks: GitHubLink[];
  pendingGithubLinks: GitHubLink[];
  syncingGithubLinks: string[];
  onDeleteFile: (fileId: string) => void;
  onDeleteGithubLink: (linkId: string) => void;
  onSyncGithubLink: (linkId: string) => void;
}

const UploadedItemsPanel: React.FC<UploadedItemsPanelProps> = ({
  uploadedFiles,
  githubLinks,
  pendingGithubLinks,
  syncingGithubLinks,
  onDeleteFile,
  onDeleteGithubLink,
  onSyncGithubLink,
}) => {
  const [hoveredSyncButton, setHoveredSyncButton] = useState<string | null>(null);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const extractRepoName = (url: string) => {
    try {
      const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">View Uploads</Button>
      </SheetTrigger>
        <SheetContent className="w-full max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Uploaded Items</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Documents</h3>
              <div className="space-y-2">
                {uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file) => (
                    <Badge
                      key={file.id}
                      variant="secondary"
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                        onClick={() => onDeleteFile(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No documents uploaded.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">In Progress</h3>
              <div className="space-y-2">
                {pendingGithubLinks.length > 0 ? (
                  pendingGithubLinks.map((link) => (
                    <Badge
                      key={link.id}
                      variant="secondary"
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <svg
                          className="animate-spin h-4 w-4 text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="truncate" title={link.github_url}>
                          {extractRepoName(link.github_url)}
                        </span>
                      </div>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No ingestions in progress.
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Uploaded GitHub Repositories</h3>
              <div className="space-y-2">
                {githubLinks.length > 0 ? (
                  githubLinks.map((link) => (
                    <Badge
                      key={link.id}
                      variant="secondary"
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Github className="w-4 h-4 shrink-0" />
                        <span className="truncate" title={link.github_url}>
                          {extractRepoName(link.github_url)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {syncingGithubLinks.includes(link.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-blue-100 text-blue-600"
                              onClick={() => onSyncGithubLink(link.id)}
                              onMouseEnter={() => setHoveredSyncButton(link.id)}
                              onMouseLeave={() => setHoveredSyncButton(null)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            {hoveredSyncButton === link.id && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                                Sync repository
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                          onClick={() => onDeleteGithubLink(link.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No GitHub repositories linked.
                  </p>
                )}
              </div>
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
};

export default UploadedItemsPanel;