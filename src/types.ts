export interface RepairDecision {
  decision: 'REPAIR' | 'REPLACE' | 'UNCERTAIN';
  confidence: number;
  reasoning: string;
  estimatedRepairCost: string;
  estimatedNewCost: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  sustainabilityImpact: string;
}

export interface BrokenItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  description?: string;
  analysis?: RepairDecision;
  createdAt: number;
}
