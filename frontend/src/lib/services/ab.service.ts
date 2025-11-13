/**
 * A/B Testing Service
 *
 * Handles all A/B testing operations using Supabase
 */

import { getSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";

type ABPolicy = Database["public"]["Tables"]["ab_policies"]["Row"];
type ABAssignment = Database["public"]["Tables"]["ab_assignments"]["Row"];

export interface SetPolicyParams {
  prompt_name: string;
  weights: Record<number, number>; // version -> weight
  is_public?: boolean;
}

export interface AssignVariantParams {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
}

export class ABService {
  private get supabase(): any {
    return getSupabaseBrowserClient();
  }

  /**
   * Create or update an A/B testing policy
   */
  async setPolicy(userId: string, params: SetPolicyParams): Promise<ABPolicy> {
    const { prompt_name, weights, is_public = false } = params;

    // Validate weights (should sum to ~1.0 or 100)
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01 && Math.abs(totalWeight - 100) > 1) {
      throw new Error("Weights must sum to 1.0 or 100");
    }

    // Check if policy already exists
    const { data: existing } = await (this.supabase.from("ab_policies") as any)
      .select("*")
      .eq("prompt_name", prompt_name)
      .eq("created_by", userId)
      .single();

    if (existing) {
      // Update existing policy
      const { data, error } = await (this.supabase.from("ab_policies") as any)
        .update({
          weights: weights as any,
          is_public,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } else {
      // Create new policy
      const { data, error } = await (this.supabase.from("ab_policies") as any)
        .insert({
          prompt_name,
          weights: weights as any,
          created_by: userId,
          is_public,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }
  }

  /**
   * Get all policies accessible by the user
   */
  async getPolicies(userId: string, includePublic = true) {
    let query = (this.supabase.from("ab_policies") as any).select("*");

    if (includePublic) {
      query = query.or(`created_by.eq.${userId},is_public.eq.true`);
    } else {
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get a specific policy by prompt name
   */
  async getPolicyByName(
    promptName: string,
    userId: string,
  ): Promise<ABPolicy | null> {
    const { data, error } = await (this.supabase.from("ab_policies") as any)
      .select("*")
      .eq("prompt_name", promptName)
      .or(`created_by.eq.${userId},is_public.eq.true`)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || null;
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: number, userId: string): Promise<boolean> {
    const { error } = await (this.supabase.from("ab_policies") as any)
      .delete()
      .eq("id", policyId)
      .eq("created_by", userId);

    if (error) {
      return false;
    }

    return true;
  }

  /**
   * Assign a variant to a user based on the policy
   */
  async assign(
    currentUserId: string,
    params: AssignVariantParams,
  ): Promise<number> {
    const { experiment_name, prompt_name, user_id } = params;

    // Check if assignment already exists
    const { data: existing } = await (
      this.supabase.from("ab_assignments") as any
    )
      .select("*")
      .eq("experiment_name", experiment_name)
      .eq("prompt_name", prompt_name)
      .eq("user_id", user_id)
      .single();

    if (existing) {
      return existing.version;
    }

    // Get the policy
    const policy = await this.getPolicyByName(prompt_name, currentUserId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    // Randomly assign a version based on weights
    const weights = policy.weights as Record<string, number>;
    const versions = Object.keys(weights).map(Number);
    const weightValues = Object.values(weights);

    const totalWeight = weightValues.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    let selectedVersion = versions[0];
    for (let i = 0; i < versions.length; i++) {
      random -= weightValues[i];
      if (random <= 0) {
        selectedVersion = versions[i];
        break;
      }
    }

    // Create the assignment
    const { data, error } = await (this.supabase.from("ab_assignments") as any)
      .insert({
        experiment_name,
        prompt_name,
        user_id,
        version: selectedVersion,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.version;
  }

  /**
   * Get experiment statistics
   */
  async getExperimentStats(experimentName: string, userId: string) {
    // Get all assignments for this experiment
    const { data: assignments, error: assignmentsError } = await (
      this.supabase.from("ab_assignments") as any
    )
      .select("*")
      .eq("experiment_name", experimentName);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    // Group by version and count
    const versionCounts = (assignments || []).reduce(
      (acc: Record<number, number>, a: ABAssignment) => {
        acc[a.version] = (acc[a.version] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const totalAssignments = assignments?.length || 0;

    return {
      experiment_name: experimentName,
      total_assignments: totalAssignments,
      version_distribution: versionCounts,
    };
  }
}

export const abService = new ABService();
