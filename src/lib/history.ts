import { AnalysisRecord } from './types';

const HISTORY_KEY = 're-vibe-history';

export const saveAnalysis = (record: AnalysisRecord) => {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const updated = [record, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export const getHistory = (): AnalysisRecord[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getAnalysisById = (id: string): AnalysisRecord | undefined => {
  return getHistory().find(r => r.id === id);
};

export const deleteAnalysis = (id: string) => {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const updated = history.filter(r => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export const calculateStats = () => {
  const history = getHistory();
  let savings = 0;
  
  history.forEach(record => {
    // Basic savings calculation: (New - Service)
    if (record.recommendation && record.recommendation.recommendation === 'service') {
        const avgService = (record.recommendation.serviceCostMin + record.recommendation.serviceCostMax) / 2;
        const avgNew = (record.recommendation.newProductPriceMin + record.recommendation.newProductPriceMax) / 2;
        savings += Math.max(0, avgNew - avgService);
    }
  });

  return {
    total: history.length,
    savings,
    itemsSold: history.filter(r => r.selectedAction === 'buy').length // Counting buy as a proxy for "decided to replace/sell old"
  };
};
