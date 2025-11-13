/**
 * Deployments Service
 *
 * Handles all deployment-related operations using Supabase
 */

import { getSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";

type Deployment = Database["public"]["Tables"]["deployments"]["Row"];

export interface CreateDeploymentParams {
  prompt_name: string;
  version: number;
  environment: string;
}

export class DeploymentsService {
  private get supabase(): any {
    return getSupabaseBrowserClient();
  }

  /**
   * Create a new deployment
   */
  async createDeployment(userId: string, params: CreateDeploymentParams) {
    const { prompt_name, version, environment } = params;

    // Find the prompt by name and version
    const { data: prompt, error: promptError } = await (
      this.supabase.from("prompts") as any
    )
      .select("*")
      .eq("name", prompt_name)
      .eq("version", version)
      .single();

    if (promptError || !prompt) {
      throw new Error("Prompt not found");
    }

    // Create the deployment
    const { data, error } = await (this.supabase.from("deployments") as any)
      .insert({
        prompt_id: prompt.id,
        environment,
        deployed_by: userId,
      })
      .select(`
        *,
        prompt:prompts(*),
        user:users!deployments_deployed_by_fkey(id,email,role)
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get current deployment for an environment
   */
  async getCurrentDeployment(
    environment: string,
    userId: string,
    promptName?: string,
  ) {
    let query = (this.supabase.from("deployments") as any)
      .select(`
        *,
        prompt:prompts(*),
        user:users!deployments_deployed_by_fkey(id,email,role)
      `)
      .eq("environment", environment)
      .order("deployed_at", { ascending: false })
      .limit(1);

    if (promptName) {
      // We need to join with prompts to filter by name
      // Since we can't do this directly in the query, we'll filter client-side
      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      const filtered = data?.filter((d: any) => d.prompt?.name === promptName);
      return filtered && filtered.length > 0 ? filtered[0] : null;
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || null;
  }

  /**
   * Get deployment history for an environment
   */
  async getHistory(
    environment: string,
    userId: string,
    params: { limit?: number; offset?: number; promptName?: string } = {},
  ) {
    const { limit = 20, offset = 0, promptName } = params;

    const { data, error } = await (this.supabase.from("deployments") as any)
      .select(`
        *,
        prompt:prompts(*),
        user:users!deployments_deployed_by_fkey(id,email,role)
      `)
      .eq("environment", environment)
      .order("deployed_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      throw new Error(error.message);
    }

    let items = data || [];

    // Filter by prompt name if specified (client-side)
    if (promptName) {
      items = items.filter((d: any) => d.prompt?.name === promptName);
    }

    return items;
  }
}

export const deploymentsService = new DeploymentsService();
