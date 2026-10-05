import { Project, CalculationParameters, Branch, Cable } from './types';
import { DEFAULT_PARAMETERS, SAMPLE_BRANCHES, SAMPLE_CABLES } from './sample-data';

const STORAGE_KEY_PROJECTS = 'autotray_projects_v1';
const STORAGE_KEY_ACTIVE_ID = 'autotray_active_project_id_v1';

export function getStoredProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load projects from localStorage:', e);
    return [];
  }
}

export function saveStoredProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage:', e);
  }
}

export function getStoredActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch {
    return null;
  }
}

export function setStoredActiveProjectId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }
  } catch {}
}

export function createNewProject(
  name: string,
  code: string,
  description: string = '',
  parameters: CalculationParameters = DEFAULT_PARAMETERS
): Project {
  const newProj: Project = {
    id: `PRJ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'Untitled Project',
    code: code.trim().toUpperCase() || 'PRJ-001',
    description: description.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parameters: { ...parameters },
    branches: [], // Starts completely empty as requested
    cables: [],   // Starts completely empty as requested
  };

  const projects = getStoredProjects();
  projects.unshift(newProj);
  saveStoredProjects(projects);
  setStoredActiveProjectId(newProj.id);
  return newProj;
}

export function createDemoProject(): Project {
  const demoProj: Project = {
    id: `PRJ_DEMO_${Date.now()}`,
    name: 'Industrial Refinery - Multi-Level Riser',
    code: 'DEMO-REF-01',
    description: '3-tier substation transition with 18 branches and 42 mixed power/control/data cables',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parameters: { ...DEFAULT_PARAMETERS },
    branches: JSON.parse(JSON.stringify(SAMPLE_BRANCHES)),
    cables: JSON.parse(JSON.stringify(SAMPLE_CABLES)),
  };

  const projects = getStoredProjects();
  projects.unshift(demoProj);
  saveStoredProjects(projects);
  setStoredActiveProjectId(demoProj.id);
  return demoProj;
}

export function updateStoredProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getStoredProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const updated: Project = {
    ...projects[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  projects[idx] = updated;
  saveStoredProjects(projects);
  return updated;
}

export function deleteStoredProject(id: string): void {
  const projects = getStoredProjects();
  const filtered = projects.filter(p => p.id !== id);
  saveStoredProjects(filtered);
  const activeId = getStoredActiveProjectId();
  if (activeId === id) {
    setStoredActiveProjectId(filtered.length > 0 ? filtered[0].id : null);
  }
}
