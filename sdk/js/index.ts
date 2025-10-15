
export class Client {
  baseUrl: string;
  token?: string;
  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }
  headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }
  async login(email: string, password: string) {
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${this.baseUrl}/auth/login`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    this.token = data.access_token;
    return data.access_token as string;
  }
  async createPrompt(name: string, template: string, variables: string[]) {
    const res = await fetch(`${this.baseUrl}/prompts/`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ name, template, variables }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async updatePrompt(name: string, template: string, variables: string[]) {
    const res = await fetch(`${this.baseUrl}/prompts/${name}`, { method: 'PUT', headers: this.headers(), body: JSON.stringify({ template, variables }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async listVersions(name: string) {
    const res = await fetch(`${this.baseUrl}/prompts/${name}/versions`, { headers: this.headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async diff(name: string, fromVersion: number, toVersion: number) {
    const res = await fetch(`${this.baseUrl}/prompts/${name}/diff?from=${fromVersion}&to=${toVersion}`, { headers: this.headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async deploy(promptName: string, version: number, environment: string) {
    const res = await fetch(`${this.baseUrl}/deployments/`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ prompt_name: promptName, version, environment }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async assignVariant(experiment: string, promptName: string, userId: string) {
    const res = await fetch(`${this.baseUrl}/ab/assign`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ experiment_name: experiment, prompt_name: promptName, user_id: userId }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async recordUsage(promptId: number, userId?: string, output?: string, success: boolean = true, latencyMs?: number, cost?: number) {
    const res = await fetch(`${this.baseUrl}/usage/`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ prompt_id: promptId, user_id: userId, output, success, latency_ms: latencyMs, cost }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}

