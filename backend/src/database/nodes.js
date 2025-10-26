import { supabase } from './supabaseClient.js';

export async function insertNode(treeId, resultsJson) {
  const { data, error } = await supabase
    .from('nodes')
    .insert({
      tree_id: treeId,
      results_json: resultsJson,
      status: 'success'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNode(nodeId, updates) {
  const { data, error } = await supabase
    .from('nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
