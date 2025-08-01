import { useState, useCallback } from 'react';

export interface ModalState {
  isOpen: boolean;
  title: string;
  content: React.ReactNode;
}

export interface UseModalStateResult {
  modalState: ModalState;
  openModal: (title: string, content: React.ReactNode) => void;
  closeModal: () => void;
  updateContent: (content: React.ReactNode) => void;
  updateTitle: (title: string) => void;
}

export const useModalState = (initialState?: Partial<ModalState>): UseModalStateResult => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    content: null,
    ...initialState,
  });

  const openModal = useCallback((title: string, content: React.ReactNode) => {
    setModalState({
      isOpen: true,
      title,
      content,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const updateContent = useCallback((content: React.ReactNode) => {
    setModalState(prev => ({
      ...prev,
      content,
    }));
  }, []);

  const updateTitle = useCallback((title: string) => {
    setModalState(prev => ({
      ...prev,
      title,
    }));
  }, []);

  return {
    modalState,
    openModal,
    closeModal,
    updateContent,
    updateTitle,
  };
};

/**
 * Hook for managing multiple modal states
 */
export const useMultipleModals = () => {
  const [modals, setModals] = useState<{ [key: string]: ModalState }>({});

  const openModal = useCallback((key: string, title: string, content: React.ReactNode) => {
    setModals(prev => ({
      ...prev,
      [key]: {
        isOpen: true,
        title,
        content,
      },
    }));
  }, []);

  const closeModal = useCallback((key: string) => {
    setModals(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: false,
      },
    }));
  }, []);

  const updateModal = useCallback((key: string, updates: Partial<ModalState>) => {
    setModals(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  }, []);

  const isModalOpen = useCallback((key: string): boolean => {
    return modals[key]?.isOpen || false;
  }, [modals]);

  const getModal = useCallback((key: string): ModalState | undefined => {
    return modals[key];
  }, [modals]);

  return {
    modals,
    openModal,
    closeModal,
    updateModal,
    isModalOpen,
    getModal,
  };
};