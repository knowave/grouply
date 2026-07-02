import React from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
