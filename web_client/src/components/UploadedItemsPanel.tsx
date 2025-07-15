import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, FileText, Github } from 'lucide-react';
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
  onDeleteFile: (fileId: string) => void;
  onDeleteGithubLink: (linkId: string) => void;
}

const UploadedItemsPanel: React.FC<UploadedItemsPanelProps> = ({
  uploadedFiles,
  githubLinks,
  onDeleteFile,
  onDeleteGithubLink,
}) => {
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
            <h3 className="text-lg font-semibold mb-2">GitHub Repositories</h3>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                      onClick={() => onDeleteGithubLink(link.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
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
