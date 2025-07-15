import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const API_URL = 'http://localhost:3000';

const SystemPrompt = () => {
  const [corePrompt, setCorePrompt] = useState('');
  const [toolKnowledgePrompt, setToolKnowledgePrompt] = useState('');
  const [editedCorePrompt, setEditedCorePrompt] = useState('');
  const [editedToolKnowledgePrompt, setEditedToolKnowledgePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/system-prompt`);
      const { core_system_prompt, tool_knowledge_prompt } = response.data;
      setCorePrompt(core_system_prompt);
      setToolKnowledgePrompt(tool_knowledge_prompt);
      setEditedCorePrompt(core_system_prompt);
      setEditedToolKnowledgePrompt(tool_knowledge_prompt);
    } catch (error) {
      console.error('Failed to fetch system prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/system-prompt`, {
        core_system_prompt: editedCorePrompt,
        tool_knowledge_prompt: editedToolKnowledgePrompt,
      });
      setCorePrompt(editedCorePrompt);
      setToolKnowledgePrompt(editedToolKnowledgePrompt);
      alert('System prompts updated successfully!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save system prompts:', error);
      alert('Failed to update system prompts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSheetOpen) {
      fetchPrompts();
    }
  }, [isSheetOpen]);

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit System Prompts</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="core-prompt">Core System Prompt</Label>
              <Textarea
                id="core-prompt"
                value={editedCorePrompt}
                onChange={(e) => setEditedCorePrompt(e.target.value)}
                placeholder="Enter the core system prompt."
                rows={15}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tool-knowledge-prompt">Tool Knowledge Prompt</Label>
              <Textarea
                id="tool-knowledge-prompt"
                value={editedToolKnowledgePrompt}
                onChange={(e) => setEditedToolKnowledgePrompt(e.target.value)}
                placeholder="Enter the tool knowledge prompt."
                rows={15}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button>Set System Prompt</Button>
        </SheetTrigger>
        <SheetContent className="w-full max-w-[1200px]">
          <SheetHeader>
            <SheetTitle>System Prompts</SheetTitle>
          </SheetHeader>
          <div className="grid gap-6 py-4">
            <div>
              <Label className="text-lg font-semibold">Core System Prompt</Label>
              <div className="mt-2 p-4 border rounded-md bg-gray-50 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{corePrompt}</pre>
              </div>
            </div>
            <div>
              <Label className="text-lg font-semibold">Tool Knowledge Prompt</Label>
              <div className="mt-2 p-4 border rounded-md bg-gray-50 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{toolKnowledgePrompt}</pre>
              </div>
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
            <Button onClick={() => setIsDialogOpen(true)}>Update</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SystemPrompt;