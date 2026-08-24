import { createClient } from '@supabase/supabase-js';

// Abstract Storage Interface
// This ensures we can swap to S3 or another provider later without changing business logic
export interface StorageProvider {
  uploadFile(path: string, file: File | Buffer, contentType: string): Promise<{ url: string; path: string }>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): string;
}

// Supabase Implementation
class SupabaseStorage implements StorageProvider {
  private client;
  private bucket = 'resumes'; // Default bucket name

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // We initialize the client only if variables are present, 
    // to avoid throwing errors during build/UI dev without a backend
    this.client = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey) 
      : null;
  }

  async uploadFile(path: string, file: File | Buffer, contentType: string): Promise<{ url: string; path: string }> {
    if (!this.client) throw new Error("Storage provider not configured");

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const url = this.getFileUrl(data.path);
    return { url, path: data.path };
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.client) throw new Error("Storage provider not configured");

    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  getFileUrl(path: string): string {
    if (!this.client) return "";
    
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

// Export a singleton instance
export const storage: StorageProvider = new SupabaseStorage();
