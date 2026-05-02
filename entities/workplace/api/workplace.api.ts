/**
 * @layer entities/workplace/api
 * @description Servicio de lugares de trabajo conectado al backend real (FastAPI).
 */

import { apiClient } from "@/shared/api";

// ── Types ───────────────────────────────────────────────────────

export interface Workplace {
  id: number;
  user_id: number;
  work_address: string;
  work_lat: number;
  work_lon: number;
}

export interface CreateWorkplaceRequest {
  work_address: string;
  work_lat: number;
  work_lon: number;
}

// ── API Calls ───────────────────────────────────────────────────

/**
 * Lista todos los lugares de trabajo del usuario logueado.
 * Protegido.
 */
export async function fetchWorkplaces(): Promise<Workplace[]> {
  const response = await apiClient.get<Workplace[]>("/workplaces/");
  return response.data;
}

/**
 * Crea un nuevo lugar de trabajo para el motor IA.
 * Protegido.
 */
export async function createWorkplace(
  data: CreateWorkplaceRequest,
): Promise<Workplace> {
  const response = await apiClient.post<Workplace>("/workplaces/", data);
  return response.data;
}

/**
 * Elimina un lugar de trabajo.
 * Protegido.
 */
export async function deleteWorkplace(workplaceId: number): Promise<void> {
  await apiClient.delete(`/workplaces/${workplaceId}`);
}

export interface UpdateWorkplaceRequest {
  work_address?: string;
  work_lat?: number;
  work_lon?: number;
}

/**
 * Actualiza un lugar de trabajo (solo datos geográficos).
 * PATCH /workplaces/{id}
 */
export async function updateWorkplace(
  id: number,
  data: UpdateWorkplaceRequest,
): Promise<Workplace> {
  const response = await apiClient.patch<Workplace>(`/workplaces/${id}`, data);
  return response.data;
}
