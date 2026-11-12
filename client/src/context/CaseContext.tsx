import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface CaseContextType {
  currentCase: Case | null;
  cases: Case[];
  activeStep: number;
  isLoading: boolean;
  isSeeding: boolean;
  bannerMessage: string | null;
  setBannerMessage: (msg: string | null) => void;
  setActiveStep: (step: number) => void;
  selectCase: (caseId: string) => Promise<void>;
  refreshCase: () => Promise<void>;
  loadDemoProject: () => Promise<string | null>;
}

const CaseContext = createContext<CaseContextType>({
  currentCase: null,
  cases: [],
  activeStep: 1,
  isLoading: false,
  isSeeding: false,
  bannerMessage: null,
  setBannerMessage: () => {},
  setActiveStep: () => {},
  selectCase: async () => {},
  refreshCase: async () => {},
  loadDemoProject: async () => null,
});

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const res = await api.getCases();
      if (res.cases) {
        setCases(res.cases);
        // Automatically select the first case or the Campus Event Portal demo
        if (!currentCase && res.cases.length > 0) {
          const demoCase = res.cases.find((c) => c.title === 'Campus Event Portal') || res.cases[0];
          await selectCase(demoCase._id);
        }
      }
    } catch (err) {
      console.warn('[CaseContext] Could not fetch cases:', err);
    }
  };

  const selectCase = async (caseId: string) => {
    try {
      setIsLoading(true);
      const res = await api.getCase(caseId);
      if (res.case) {
        setCurrentCase({
          ...res.case,
          stats: res.stats,
        });

        // Auto-navigate stepper according to case status
        if (res.case.status === 'draft') {
          setActiveStep(1);
        } else if (res.case.status === 'in_review') {
          setActiveStep(4); // Review workspace
        } else if (res.case.status === 'published') {
          setActiveStep(5); // Handover
        }
      }
    } catch (err) {
      console.error('[CaseContext] Failed to select case:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCase = async () => {
    if (currentCase) {
      await selectCase(currentCase._id);
    } else {
      await fetchCases();
    }
  };

  const loadDemoProject = async (): Promise<string | null> => {
    try {
      setIsSeeding(true);
      const res = await api.seedDemo();
      if (res.case) {
        await fetchCases();
        await selectCase(res.case._id);
        setActiveStep(4); // Land user on Review workspace to inspect claims immediately
        return res.case._id;
      }
      return null;
    } catch (err) {
      console.error('[CaseContext] Load demo failed:', err);
      return null;
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [role]);

  return (
    <CaseContext.Provider
      value={{
        currentCase,
        cases,
        activeStep,
        isLoading,
        isSeeding,
        bannerMessage,
        setBannerMessage,
        setActiveStep,
        selectCase,
        refreshCase,
        loadDemoProject,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCase = () => useContext(CaseContext);
