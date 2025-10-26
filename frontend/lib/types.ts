export interface TreeNode {
  id: string;
  title: string;
  authors: string[];
  keywords: string[];
  summary: string;
  children?: TreeNode[];
}


export type TreesMap = Record<string, TreeNode | null>;
export type TabNamesMap = Record<string, string>;
