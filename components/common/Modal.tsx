import React from 'react';
import { Dialog } from '@headlessui/react';
import CloseIcon from '../icons/CloseIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out data-[closed]:opacity-0" 
        aria-hidden="true" 
      />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* The actual dialog panel */}
        <Dialog.Panel 
          className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex justify-between items-center">
            {title}
            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
              <CloseIcon className="h-6 w-6" />
            </button>
          </Dialog.Title>
          <div className="mt-4">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default Modal;