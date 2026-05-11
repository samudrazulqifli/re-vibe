import { create } from 'zustand';
import { AnalysisRecord, Recommendation } from './types';

interface ReVibeState {
  // Photo & Input
  uploadedPhoto: File | null;
  uploadedImageUrl: string | null;
  photoPreviewUrl: string | null;
  userDescription: string;
  
  // Results
  currentAnalysis: Partial<AnalysisRecord> | null;
  recommendation: Recommendation | null;
  selectedAction: 'service' | 'diy' | 'buy' | null;
  
  // History
  analysisHistory: AnalysisRecord[];

  // Actions
  setPhoto: (file: File | null, url: string | null) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setDescription: (desc: string) => void;
  setAnalysis: (analysis: Partial<AnalysisRecord>) => void;
  setRecommendation: (rec: Recommendation) => void;
  setSelectedAction: (action: 'service' | 'diy' | 'buy' | null) => void;
  addToHistory: (record: AnalysisRecord) => void;
  resetFlow: () => void;
}

export const useReVibeStore = create<ReVibeState>((set) => ({
  uploadedPhoto: null,
  uploadedImageUrl: null,
  photoPreviewUrl: null,
  userDescription: '',
  currentAnalysis: null,
  recommendation: null,
  selectedAction: null,
  analysisHistory: [],

  setPhoto: (file, url) => set({ uploadedPhoto: file, photoPreviewUrl: url }),
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
  setDescription: (desc) => set({ userDescription: desc }),
  setAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setRecommendation: (rec) => set({ recommendation: rec }),
  setSelectedAction: (action) => set({ selectedAction: action }),
  addToHistory: (record) => {
    set((state) => ({ 
      analysisHistory: [record, ...state.analysisHistory] 
    }));
    // Note: We use dynamic import or check window to avoid SSR issues if this was 
    // ever called during SSR, though here it's purely client-side.
    try {
      const history = localStorage.getItem('re-vibe-history');
      const parsed = history ? JSON.parse(history) : [];
      localStorage.setItem('re-vibe-history', JSON.stringify([record, ...parsed]));
    } catch (e) {
      console.error('Failed to save to history', e);
    }
  },
  resetFlow: () => set({ 
    uploadedPhoto: null, 
    uploadedImageUrl: null,
    photoPreviewUrl: null, 
    userDescription: '', 
    currentAnalysis: null, 
    recommendation: null, 
    selectedAction: null 
  }),
}));
