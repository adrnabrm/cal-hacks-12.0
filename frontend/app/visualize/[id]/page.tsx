'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TreeCanvas from '../../../components/TreeCanvas';
import Sidebar from '../../../components/Sidebar';
import WateringOverlay from '../../../components/WateringOverlay';
import BlankTreeInput from '../../../components/BlankTreeInput';
import { supabase } from '@/lib/supabaseClient';
import type { TreeNode } from '@/lib/types';

export default function VisualizePage() {
  const { id } = useParams();
  const router = useRouter();

  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [popupNode, setPopupNode] = useState<TreeNode | null>(null);

  const [isWatering, setIsWatering] = useState(false);
  const [rendered, setRendered] = useState(true);
  const [awaitingChildrenDraw, setAwaitingChildrenDraw] = useState(false);

  const [treeName, setTreeName] = useState<string>('Research Tree');
  const firstTime = useMemo(() => !rendered, [rendered]);

  const API_BASE = 'http://localhost:8000';
  console.log('Seeding tree ID:', id);

  // 🧩 1️⃣ Fetch tree and nodes from backend
  useEffect(() => {
    const fetchTree = async () => {
      try {
        // 🔐 Get Supabase access token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('User not authenticated');

        const res = await fetch(`${API_BASE}/api/trees/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setTreeName(data.tree.title || 'Research Tree');

        // 🧠 Build nested structure from flat nodes
        const nodes = data.nodes || [];
        const nodeMap: Record<string, TreeNode> = {};
        nodes.forEach((n: any) => (nodeMap[n.id] = { ...n, children: [] }));

        nodes.forEach((n: any) => {
          if (n.parent_node_id && nodeMap[n.parent_node_id]) {
            nodeMap[n.parent_node_id].children!.push(nodeMap[n.id]);
          }
        });

        const root = nodes.find((n: any) => !n.parent_node_id);
        setTreeData(root ? nodeMap[root.id] : null);
      } catch (e) {
        console.error('Fetch tree failed:', e);
      }
    };

    if (id) fetchTree();
  }, [id]);

  // 🌱 2️⃣ Seed the tree (initial Bright Data call)
  const seedTree = async (prompt: string) => {
    setIsWatering(true);
    setTreeData({
      id: 'seed',
      results_json: {
        title: `Seeding: ${prompt}`,
        summary: 'Generating initial research tree…',
      },
      children: [],
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const res = await fetch(`${API_BASE}/api/trees/${id}/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setTreeData(data.treeRoot);
      setAwaitingChildrenDraw(true);
      setRendered(false);
    } catch (e) {
      console.error('Seed tree failed:', e);
      setIsWatering(false);
      setAwaitingChildrenDraw(false);
      setTreeData((prev) =>
        prev
          ? {
              ...prev,
              results_json: {
                ...(prev.results_json || {}),
                summary: 'Error seeding tree.',
              },
            }
          : prev
      );
    }
  };

  // 🌿 3️⃣ Expand existing node (section-based)
  const expandNode = async (nodeId: string, section: string) => {
    setIsWatering(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const res = await fetch(`${API_BASE}/api/nodes/${nodeId}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ section }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const newChildren: TreeNode[] = data.children || [];

      // Recursively attach new children to parent
      const attachChildren = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, children: [...(node.children || []), ...newChildren] };
        }
        return { ...node, children: (node.children || []).map(attachChildren) };
      };

      setTreeData((prev) => (prev ? attachChildren(prev) : prev));
      setAwaitingChildrenDraw(true);
      setRendered(false);
    } catch (e) {
      console.error('Expand node failed:', e);
      setIsWatering(false);
      setAwaitingChildrenDraw(false);
    }
  };

  // 🗑️ 4️⃣ Delete tree (redirect only for now)
  const handleDelete = async () => {
    if (confirm(`Delete ${treeName}?`)) {
      router.push('/library');
    }
  };

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="relative z-[100] pointer-events-auto">
        <div className="absolute top-4 left-4 flex gap-2">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-md transition-all"
          >
            Delete Tree
          </button>
        </div>

        <div className="absolute top-4 right-4 bg-white/80 px-4 py-2 rounded-full shadow text-green-800 font-semibold">
          {treeName}
        </div>
      </div>

      {/* 💧 Watering Overlay */}
      <WateringOverlay show={isWatering} />

      {/* 🌳 Tree Canvas */}
      <TreeCanvas
        activeTab={treeName}
        data={treeData}
        firstTime={firstTime}
        onNodeClick={(n) => setPopupNode(n)}
        onWatering={setIsWatering}
        onRendered={() => {
          if (awaitingChildrenDraw) {
            setAwaitingChildrenDraw(false);
            setRendered(true);
            setIsWatering(false);
          }
        }}
      />

      {/* 🌱 Input appears only if tree is empty */}
      <BlankTreeInput visible={!treeData} onSubmit={seedTree} />

      {/* 📚 Sidebar */}
      <Sidebar
        node={popupNode}
        onClose={() => setPopupNode(null)}
        onExpand={(section) =>
          popupNode && expandNode(popupNode.id, section)
        }
      />
    </main>
  );
}
