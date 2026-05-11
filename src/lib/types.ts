export interface AIAnalysisResult {
  itemName: string;
  itemCategory: 'elektronik' | 'furnitur' | 'peralatan_rumah' | 'lainnya';
  damageTypes: string[];
  severity: 'ringan' | 'sedang' | 'parah';
  severityScore: number;
  confidence: number;
  isRepairable: boolean;
  damageDescription: string;
  estimatedAge: string;
}

export interface AnalysisRecord extends AIAnalysisResult {
  id: string;
  imageUrl: string;
  timestamp: number;
  recommendation?: Recommendation;
  selectedAction?: 'service' | 'diy' | 'buy';
}

export interface Recommendation {
  recommendation: 'service' | 'diy' | 'buy';
  primaryReasoning: string;
  serviceCostMin: number;
  serviceCostMax: number;
  newProductPriceMin: number;
  newProductPriceMax: number;
  costRatioPercent: number;
  diyPossible: boolean;
  diyDifficulty: 'mudah' | 'sedang' | 'sulit';
  searchKeywords: {
    service: string;
    product: string;
    diy: string;
  };
  additionalTips?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  points: number;
  level: string;
}
