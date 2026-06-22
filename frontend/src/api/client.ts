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
  active?: boolean;
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
    language: 'fr' | 'en' = 'fr',
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AnalysisResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    const response = await apiClient.post<AnalysisResponse>('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  },

  /**
   * Detect the language of a client NDA file.
   */
  detectLanguage: async (file: File): Promise<'fr' | 'en'> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ language: 'fr' | 'en' }>('/detect-language', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.language;
  },

  /**
   * Fetch reference files data from backend.
   */
  getReferenceData: async (language: 'fr' | 'en' = 'fr'): Promise<ReferenceData> => {
    const response = await apiClient.get<ReferenceData>('/reference', {
      params: { language }
    });
    return response.data;
  },

  /**
   * Verify administrative password.
   */
  verifyAdminPassword: async (password: string): Promise<boolean> => {
    try {
      await apiClient.post('/admin/verify', { password });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Fetch all clauses (active and inactive) for admin management.
   */
  getAdminClauses: async (password: string, language: 'fr' | 'en' = 'fr'): Promise<ClauseConfig[]> => {
    const response = await apiClient.get<ClauseConfig[]>('/admin/clauses', {
      headers: {
        'x-admin-password': password
      },
      params: { language }
    });
    return response.data;
  },

  /**
   * Create a new clause.
   */
  createClause: async (
    password: string,
    clause: Omit<ClauseConfig, 'active'>,
    language: 'fr' | 'en' = 'fr'
  ): Promise<ClauseConfig> => {
    const response = await apiClient.post<ClauseConfig>('/admin/clauses', clause, {
      headers: {
        'x-admin-password': password
      },
      params: { language }
    });
    return response.data;
  },

  /**
   * Update (modify) an existing clause. Under the hood, this will deactivate the old one
   * and create a new versioned copy.
   */
  updateClause: async (
    password: string,
    id: string,
    clause: Omit<ClauseConfig, 'id' | 'active'>,
    language: 'fr' | 'en' = 'fr'
  ): Promise<{ message: string; oldClause: ClauseConfig; newClause: ClauseConfig }> => {
    const response = await apiClient.put<{ message: string; oldClause: ClauseConfig; newClause: ClauseConfig }>(
      `/admin/clauses/${id}`,
      clause,
      {
        headers: {
          'x-admin-password': password
        },
        params: { language }
      }
    );
    return response.data;
  },

  /**
   * Deactivate a clause.
   */
  deactivateClause: async (password: string, id: string, language: 'fr' | 'en' = 'fr'): Promise<ClauseConfig> => {
    const response = await apiClient.patch<ClauseConfig>(
      `/admin/clauses/${id}/deactivate`,
      {},
      {
        headers: {
          'x-admin-password': password
        },
        params: { language }
      }
    );
    return response.data;
  },

  /**
   * Reactivate a clause.
   */
  reactivateClause: async (password: string, id: string, language: 'fr' | 'en' = 'fr'): Promise<ClauseConfig> => {
    const response = await apiClient.patch<ClauseConfig>(
      `/admin/clauses/${id}/reactivate`,
      {},
      {
        headers: {
          'x-admin-password': password
        },
        params: { language }
      }
    );
    return response.data;
  },
};

