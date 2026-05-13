import { create } from 'zustand';
import { AnalysisRecord, Recommendation } from './types';

interface ReVibeState {
  uploadedPhoto: File | null;
  uploadedImageUrl: string | null;
  photoPreviewUrl: string | null;
  userDescription: string;

  currentAnalysis: Partial<AnalysisRecord> | null;
  recommendation: Recommendation | null;
  selectedAction: 'service' | 'diy' | 'buy' | null;

  setPhoto: (file: File | null, url: string | null) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setDescription: (desc: string) => void;
  setAnalysis: (analysis: Partial<AnalysisRecord>) => void;
  setRecommendation: (rec: Recommendation) => void;
  setSelectedAction: (action: 'service' | 'diy' | 'buy' | null) => void;
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

  setPhoto: (file, url) => set({
    uploadedPhoto: file,
    photoPreviewUrl: url,
    // Reset downstream state — new photo invalidates any previous AI result.
    // Without this, /recommend & /diy show stale results from the previous photo.
    uploadedImageUrl: null,
    currentAnalysis: null,
    recommendation: null,
    selectedAction: null,
  }),
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
  setDescription: (desc) => set({ userDescription: desc }),
  setAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setRecommendation: (rec) => set({ recommendation: rec }),
  setSelectedAction: (action) => set({ selectedAction: action }),
  resetFlow: () => set({
    uploadedPhoto: null,
    uploadedImageUrl: null,
    photoPreviewUrl: null,
    userDescription: '',
    currentAnalysis: null,
    recommendation: null,
    selectedAction: null,
  }),
}));
