/**
 * Prompts Service
 *
 * Handles all prompt-related operations using Supabase
 */

import { createClient } from "@/utils/supabase/client";
import type { Database } from "../supabase/types";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
type PromptInsert = Database["public"]["Tables"]["prompts"]["Insert"];
type PromptUpdate = Database["public"]["Tables"]["prompts"]["Update"];

export interface CreatePromptParams {
  name: string;
  template: string;
  variables?: string[];
  is_public?: boolean;
}

export interface UpdatePromptParams {
  template?: string;
  variables?: string[];
  is_public?: boolean;
}

export interface ListPromptsParams {
  q?: string;
  active?: boolean;
  created_by?: string;
  latest_only?: boolean;
  sort_by?: "created_at" | "version" | "name";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  visibility?: "all" | "public" | "private" | "owned";
  owned?: boolean;
}

export class PromptsService {
  private get supabase(): any {
    return createClient();
  }

  /**
   * List prompts with filters
   */
  async listPrompts(userId: string, params: ListPromptsParams = {}) {
    const {
      q,
      active,
      created_by,
      latest_only = false,
      sort_by = "created_at",
      order = "desc",
      limit = 20,
      offset = 0,
      visibility = "all",
      owned = false,
    } = params;

    let query = this.supabase
      .from("prompts")
      .select("*, author:users!prompts_created_by_fkey(id, email, role)", {
        count: "exact",
      });

    // Apply visibility filter
    if (visibility === "public") {
      query = query.eq("is_public", true);
    } else if (visibility === "private") {
      query = query.eq("is_public", false).eq("created_by", userId);
    } else if (visibility === "owned" || owned) {
      query = query.eq("created_by", userId);
    } else {
      // 'all' - show public OR owned
      query = query.or(`is_public.eq.true,created_by.eq.${userId}`);
    }

    // Apply other filters
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }
    if (active !== undefined) {
      query = query.eq("active", active);
    }
    if (created_by) {
      query = query.eq("created_by", created_by);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: order === "asc" });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // If latest_only, filter to get only the latest version of each prompt
    let items = data || [];
    if (latest_only && items.length > 0) {
      const latestVersions = new Map<string, any>();
      for (const item of items) {
        const existing = latestVersions.get(item.name);
        if (!existing || item.version > existing.version) {
          latestVersions.set(item.name, item);
        }
      }
      items = Array.from(latestVersions.values());
    }

    const total = count || 0;
    const has_next = offset + limit < total;

    return {
      items,
      count: total,
      limit,
      offset,
      has_next,
    };
  }

  /**
   * Create a new prompt
   */
  async createPrompt(
    userId: string,
    params: CreatePromptParams,
  ): Promise<Prompt> {
    const { name, template, variables = [], is_public = false } = params;

    // Get the next version number for this prompt name
    const { data: existingPrompts } = await this.supabase
      .from("prompts")
      .select("version")
      .eq("name", name)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion =
      existingPrompts && existingPrompts.length > 0
        ? existingPrompts[0].version + 1
        : 1;

    // Deactivate all previous versions
    if (nextVersion > 1) {
      await this.supabase
        .from("prompts")
        .update({ active: false })
        .eq("name", name);
    }

    // Create the new prompt
    const { data, error } = await this.supabase
      .from("prompts")
      .insert({
        name,
        template,
        variables: variables as any,
        version: nextVersion,
        created_by: userId,
        active: true,
        is_public,
      })
      .select("*, author:users!prompts_created_by_fkey(id, email, role)")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get active version of a prompt by name
   */
  async getActivePrompt(name: string, userId: string): Promise<Prompt | null> {
    const { data, error } = await this.supabase
      .from("prompts")
      .select("*, author:users!prompts_created_by_fkey(id, email, role)")
      .eq("name", name)
      .eq("active", true)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || null;
  }

  /**
   * Get specific version of a prompt
   */
  async getVersion(
    name: string,
    version: number,
    userId: string,
  ): Promise<Prompt | null> {
    const { data, error } = await this.supabase
      .from("prompts")
      .select("*, author:users!prompts_created_by_fkey(id, email, role)")
      .eq("name", name)
      .eq("version", version)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || null;
  }

  /**
   * List all versions of a prompt
   */
  async listVersions(
    name: string,
    userId: string,
    params: {
      limit?: number;
      offset?: number;
      active?: boolean;
      created_by?: string;
    } = {},
  ) {
    const { limit = 20, offset = 0, active, created_by } = params;

    let query = this.supabase
      .from("prompts")
      .select("*, author:users!prompts_created_by_fkey(id, email, role)", {
        count: "exact",
      })
      .eq("name", name)
      .or(`is_public.eq.true,created_by.eq.${userId}`);

    if (active !== undefined) {
      query = query.eq("active", active);
    }
    if (created_by) {
      query = query.eq("created_by", created_by);
    }

    query = query
      .order("version", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items = data || [];
    const total = count || 0;
    const has_next = offset + limit < total;

    return {
      items,
      count: total,
      limit,
      offset,
      has_next,
    };
  }

  /**
   * Update a prompt (creates a new version)
   */
  async updatePrompt(
    name: string,
    userId: string,
    params: UpdatePromptParams,
  ): Promise<Prompt> {
    // Get the current active version
    const currentPrompt = await this.getActivePrompt(name, userId);
    if (!currentPrompt) {
      throw new Error("Prompt not found");
    }

    // Check ownership
    if (currentPrompt.created_by !== userId) {
      throw new Error("You do not have permission to update this prompt");
    }

    // Create a new version with the updates
    const {
      template = currentPrompt.template,
      variables = currentPrompt.variables as string[],
      is_public,
    } = params;

    return this.createPrompt(userId, {
      name,
      template,
      variables,
      is_public: is_public !== undefined ? is_public : currentPrompt.is_public,
    });
  }

  /**
   * Rollback to a specific version
   */
  async rollback(
    name: string,
    version: number,
    userId: string,
  ): Promise<Prompt> {
    // Get the version to rollback to
    const targetVersion = await this.getVersion(name, version, userId);
    if (!targetVersion) {
      throw new Error("Version not found");
    }

    // Check ownership
    if (targetVersion.created_by !== userId) {
      throw new Error("You do not have permission to rollback this prompt");
    }

    // Create a new version with the same template and variables
    return this.createPrompt(userId, {
      name,
      template: targetVersion.template,
      variables: targetVersion.variables as string[],
      is_public: targetVersion.is_public,
    });
  }

  /**
   * Delete all versions of a prompt (admin only)
   */
  async deletePrompt(name: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("prompts")
      .delete()
      .eq("name", name)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  }

  /**
   * Set visibility (public/private) for all versions of a prompt
   */
  async setVisibility(
    name: string,
    userId: string,
    isPublic: boolean,
  ): Promise<Prompt> {
    // Check ownership
    const { data: prompts } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("name", name)
      .eq("created_by", userId)
      .limit(1);

    if (!prompts || prompts.length === 0) {
      throw new Error("Prompt not found or you do not have permission");
    }

    // Update all versions
    await this.supabase
      .from("prompts")
      .update({ is_public: isPublic })
      .eq("name", name)
      .eq("created_by", userId);

    // Return the active version
    const activePrompt = await this.getActivePrompt(name, userId);
    if (!activePrompt) {
      throw new Error("Failed to update prompt visibility");
    }

    return activePrompt;
  }

  /**
   * Clone a prompt
   */
  async clonePrompt(
    name: string,
    userId: string,
    newName?: string,
  ): Promise<Prompt> {
    const sourcePrompt = await this.getActivePrompt(name, userId);
    if (!sourcePrompt) {
      throw new Error("Source prompt not found");
    }

    const cloneName = newName || `${name}_copy`;

    return this.createPrompt(userId, {
      name: cloneName,
      template: sourcePrompt.template,
      variables: sourcePrompt.variables as string[],
      is_public: false, // Clones are private by default
    });
  }

  /**
   * Get diff between two versions (client-side implementation)
   */
  async getDiff(
    name: string,
    fromVersion: number,
    toVersion: number,
    userId: string,
  ): Promise<string> {
    const [from, to] = await Promise.all([
      this.getVersion(name, fromVersion, userId),
      this.getVersion(name, toVersion, userId),
    ]);

    if (!from || !to) {
      throw new Error("One or both versions not found");
    }

    // Simple diff implementation (you can use a library like diff for better results)
    const fromLines = from.template.split("\n");
    const toLines = to.template.split("\n");

    let diff = "";
    const maxLines = Math.max(fromLines.length, toLines.length);

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i] || "";
      const toLine = toLines[i] || "";

      if (fromLine !== toLine) {
        if (fromLine) diff += `- ${fromLine}\n`;
        if (toLine) diff += `+ ${toLine}\n`;
      } else {
        diff += `  ${fromLine}\n`;
      }
    }

    return diff;
  }
}

export const promptsService = new PromptsService();
