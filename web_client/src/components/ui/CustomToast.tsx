import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomToastProps {
  id: string | number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const CustomToast: React.FC<CustomToastProps> = ({ id, message, type }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" />;
      case 'error':
        return <XCircle className="text-red-500" />;
      case 'info':
        return <Info className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getProgressBarClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-4 relative overflow-hidden w-full">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{message}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.dismiss(id)}
        className="ml-auto"
      >
        OK
      </Button>
      <div className="absolute bottom-0 left-0 h-1 w-full">
        <div
          className={`h-full ${getProgressBarClass()}`}
          style={{ animation: 'progress 10s linear forwards' }}
        ></div>
      </div>
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default CustomToast;