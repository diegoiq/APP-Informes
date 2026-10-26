const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:4000/api'
);

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Error ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  // Auth
  public getAuthStats() {
    return this.request('/auth/stats');
  }

  public register(payload: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public login(credentials: any) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  public getMe() {
    return this.request('/auth/me');
  }

  public getUsers() {
    return this.request('/auth/users');
  }

  // SAP Ingestion & Avisos
  public uploadSapExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/sap/upload', {
      method: 'POST',
      body: formData
    });
  }

  public getAvisos(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/avisos${query}`);
  }

  public getAvisoById(id: string) {
    return this.request(`/avisos/${id}`);
  }

  public updateAvisoField(id: string, data: any) {
    return this.request(`/avisos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Triaje
  public registrarContactoTriaje(avisoId: string, data: any) {
    return this.request(`/triaje/${avisoId}/contacto`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public getPlantillaRespuesta(avisoId: string) {
    return this.request(`/triaje/${avisoId}/plantilla-respuesta`);
  }

  // Personal y Programación
  public getPersonal() {
    return this.request('/personal');
  }

  public createPersonal(data: any) {
    return this.request('/personal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public getProgramacionSemanal(semana: number, anio: number, rubro?: string) {
    const query = new URLSearchParams({ semana: String(semana), anio: String(anio) });
    if (rubro) query.append('rubro', rubro);
    return this.request(`/programacion?${query.toString()}`);
  }

  public guardarAsignacion(data: any) {
    return this.request('/programacion/asignacion', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public eliminarAsignacion(id: string) {
    return this.request(`/programacion/asignacion/${id}`, {
      method: 'DELETE'
    });
  }

  // Obras y Libro Diario
  public getObras() {
    return this.request('/obras');
  }

  public createObra(data: any) {
    return this.request('/obras', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public getLibroDiario(obraId: string) {
    return this.request(`/obras/${obraId}/libro-diario`);
  }

  public createLibroDiario(obraId: string, data: any) {
    return this.request(`/obras/${obraId}/libro-diario`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Informes CRR
  public getInformes() {
    return this.request('/informes');
  }

  public getInformeById(id: string) {
    return this.request(`/informes/${id}`);
  }

  public createInforme(data: any) {
    return this.request('/informes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const api = new ApiService();
export default api;
