export type Category = "vault" | "code" | "agents" | "skills" | "data";

export interface FileNode {
  name: string;
  path: string;       // vault root'a göreli, '/' ile başlar
  isDir: boolean;
  category: Category;
  size?: number;
  isProtected?: boolean;  // secret-guard tarafından mask'lı
  children?: FileNode[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface FileContent {
  path: string;
  content: string;
  isProtected: boolean;
  size: number;
}
