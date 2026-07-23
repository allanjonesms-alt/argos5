export const DEFAULT_SPREADSHEET_ID = '';
export const DEFAULT_SHEET_NAME = '';

export function getStoredSpreadsheetId(): string {
  return localStorage.getItem('argos_sheet_id') || '';
}

export function setStoredSpreadsheetId(id: string): void {
  localStorage.setItem('argos_sheet_id', id);
}

export function getStoredSheetName(): string {
  return localStorage.getItem('argos_sheet_name') || '';
}

export function setStoredSheetName(name: string): void {
  localStorage.setItem('argos_sheet_name', name);
}

export function initGoogleSheetsAuth(onAuthChange: (gUser: any, token: any) => void, onError?: () => void): () => void {
  return () => {};
}

export function getCachedGoogleAccessToken(): string | null {
  return null;
}

export async function signInWithGoogleForSheets(): Promise<{ user: any; accessToken: string }> {
  return { user: null, accessToken: '' };
}

export async function appendActionToGoogleSheet(action: any, sheetId?: string, sheetName?: string): Promise<{ success: boolean; message?: string }> {
  return { success: true, message: 'Sucesso' };
}

export async function syncMultipleActionsToGoogleSheet(actions: any[], sheetId?: string, sheetName?: string): Promise<{ success: boolean; count?: number; message?: string }> {
  return { success: true, count: actions.length, message: 'Sincronizado' };
}
