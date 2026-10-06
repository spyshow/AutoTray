import {
  CalculationRequest,
  CalculationResponse,
  Project,
  ProjectSummary,
  CableCatalogItem,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Projects Database Endpoints
// ---------------------------------------------------------------------------

export async function apiGetProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch projects (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function apiGetProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch project ${projectId} (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function apiCreateProject(payload: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create project (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function apiUpdateProject(projectId: string, payload: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update project ${projectId} (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function apiDeleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete project ${projectId} (${response.status}): ${errorBody}`);
  }
}

export async function apiCalculateProject(projectId: string): Promise<CalculationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/projects/${encodeURIComponent(projectId)}/calculate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to calculate project ${projectId} (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Technical Catalog Database Endpoints
// ---------------------------------------------------------------------------

export async function apiGetCatalog(category?: string, search?: string): Promise<CableCatalogItem[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const url = `${API_BASE_URL}/api/v1/catalog${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch cable catalog (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function apiAddCatalogItem(item: CableCatalogItem): Promise<CableCatalogItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to add catalog item (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Stateless Sizing & Export Endpoints
// ---------------------------------------------------------------------------

export async function calculateSizingApi(
  payload: CalculationRequest
): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/calculate-sizing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Calculation failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function exportExcelApi(
  calculationResult: CalculationResponse
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/export-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(calculationResult),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Export failed (${response.status}): ${errorBody}`);
  }

  return response.blob();
}

export async function downloadSampleTemplateApi(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sample-template`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to download template (${response.status}): ${errorBody}`);
  }

  return response.blob();
}
