import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ClauseConfig {
  id: string;
  name: string;
  description: string;
  criticality: 'High' | 'Medium' | 'Low';
}

export interface ReferenceData {
  referenceNda: string;
  clausier: ClauseConfig[];
}

export interface ClauseAnalysisResult {
  id: string;
  name: string;
  status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Missing';
  currentText: string;
  referenceText: string;
  deviation: string;
  recommendation: string;
  proposal: string;
}

export interface AnalysisResponse {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  overallAssessment: string;
  clauses: ClauseAnalysisResult[];
}

export const api = {
  /**
   * Upload and analyze a client NDA file.
   */
  analyzeNDA: async (
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AnalysisResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<AnalysisResponse>('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  },

  /**
   * Fetch reference files data from backend.
   */
  getReferenceData: async (): Promise<ReferenceData> => {
    const response = await apiClient.get<ReferenceData>('/reference');
    return response.data;
  },
};
