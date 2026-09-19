import fs from "fs/promises";
import path from "path";

export interface StorageProvider {
  uploadFile(filePath: string, file: Buffer, contentType: string): Promise<{ url: string; path: string }>;
  deleteFile(filePath: string): Promise<void>;
  getFileUrl(filePath: string): string;
}

class LocalStorage implements StorageProvider {
  private uploadDir = path.join(process.cwd(), "public", "uploads");

  constructor() {
    // Ensure the upload directory exists
    fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
  }

  async uploadFile(filePath: string, file: Buffer, contentType: string): Promise<{ url: string; path: string }> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    
    const url = `/uploads/${filePath}`;
    return { url, path: filePath };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  getFileUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}

export const storage: StorageProvider = new LocalStorage();
