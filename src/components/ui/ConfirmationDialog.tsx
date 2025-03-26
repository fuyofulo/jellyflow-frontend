import React from "react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  isSuccess: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  confirmButtonText?: string;
  closeButtonText?: string;
  showCloseButton?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  isSuccess,
  isLoading,
  onConfirm,
  onClose,
  confirmButtonText = "Confirm",
  closeButtonText = "Cancel",
  showCloseButton = true,
}) => {
  // Add useEffect to automatically navigate to dashboard when deletion is successful
  React.useEffect(() => {
    // If dialog is showing success and the confirm button says "Go to Dashboard", auto-navigate
    if (isOpen && isSuccess && confirmButtonText === "Go to Dashboard") {
      // Add a short delay to show the success message before navigating
      const timer = setTimeout(() => {
        onConfirm();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isSuccess, confirmButtonText, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <div className="bg-zinc-900 border border-yellow-600/30 rounded-lg shadow-2xl w-[400px] overflow-hidden">
        <div className="p-4 border-b border-yellow-600/30">
          <h3 className="text-lg font-bold text-white font-mono">{title}</h3>
        </div>
        <div className="p-6 text-zinc-300">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-600"></div>
            </div>
          ) : (
            <p className="font-mono">{message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 bg-zinc-950">
          {showCloseButton && !isLoading && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded hover:bg-zinc-700 transition-colors font-mono"
            >
              {closeButtonText}
            </button>
          )}
          {!isLoading && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition-colors font-mono"
            >
              {confirmButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
