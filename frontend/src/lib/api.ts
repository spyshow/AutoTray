import { CalculationRequest, CalculationResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
