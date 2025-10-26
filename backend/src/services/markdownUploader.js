import { supabase } from '../database/supabaseClient.js';
import { updateNode } from '../database/nodes.js';

export async function uploadMarkdown(nodeId, markdownText) {
  const filePath = `nodes/${nodeId}/paper.md`;

  const { error } = await supabase.storage
    .from('markdowns')
    .upload(filePath, markdownText, {
      upsert: true,
      contentType: 'text/markdown'
    });

  if (error) throw error;

  await updateNode(nodeId, { md_file_path: filePath });
  return filePath;
}
