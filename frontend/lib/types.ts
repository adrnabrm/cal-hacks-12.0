export interface TreeNode {
  id: string;                     // UUID from Supabase
  tree_id?: string;               // foreign key to trees
  parent_node_id?: string | null; // parent relationship
  results_json?: {
    title?: string;
    summary?: string;
    domain?: string;
    url?: string;
    snippet?: string;
    authors?: string[];
    keywords?: string[];
    status?: string;
  };
  md_file_path?: string | null;
  embedding_id?: string[] | null;
  vectorized?: boolean;
  status?: string;
  section?: string;
  created_at?: string;
  updated_at?: string;
  children?: TreeNode[];          // frontend nested structure
}


export type TreesMap = Record<string, TreeNode | null>;
export type TabNamesMap = Record<string, string>;
