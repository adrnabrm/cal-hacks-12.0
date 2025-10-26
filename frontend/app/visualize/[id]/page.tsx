// app/graphs/[id]/page.tsx
'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TreeCanvas from '../../../components/TreeCanvas';
import Sidebar from '../../../components/Sidebar';
import WateringOverlay from '../../../components/WateringOverlay';
import BlankTreeInput from '../../../components/BlankTreeInput';
// import { exampleTree } from '@/lib/exampleTree'; // not used
import type { TreeNode } from '@/lib/types';

export default function VisualizePage() {
  const { id } = useParams();
  const router = useRouter();

  // 🌳 Tree data and UI state
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [popupNode, setPopupNode] = useState<TreeNode | null>(null);

  // 💧 Watering overlay and render phases
  const [isWatering, setIsWatering] = useState(false);
  const [rendered, setRendered] = useState(true); // start "rendered" so first draw isn't animated
  const [awaitingChildrenDraw, setAwaitingChildrenDraw] = useState(false); // ignore seed draw, wait for children

  // 🏷️ Page label derived from route
  const [treeName, setTreeName] = useState<string>('Research Tree');

  // 🔄 Compute "firstTime" for TreeCanvas animations
  const firstTime = useMemo(() => !rendered, [rendered]);

  // 🪴 Decode the tree name from the Library URL (e.g., /graphs/Tree-1)
  useEffect(() => {
    if (id) {
      const decoded = decodeURIComponent(String(id));
      const formatted = decoded.replace(/-/g, ' ');
      setTreeName(formatted);
    }
  }, [id]);

  // 🌱 Trigger agent query, animate only when CHILDREN arrive
  const submitPaper = async (title: string) => {
    // 1) Show overlay and seed immediately, but do NOT toggle firstTime yet
    setIsWatering(true);
    setTreeData({
      id: 'seed',
      title: `Seed Paper: ${title}`,
      authors: ['User'],
      keywords: ['query'],
      summary: 'Fetching…',
      children: [],
    });

    try {
      // 2) Call backend agent
      const q = encodeURIComponent(title);
      const res = await fetch(`http://localhost:8000/agent?q=${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // 3) Map backend result -> TreeNode[] children
      //    Adjust mapping to your /agent response shape.
      //    Here we assume { ok, sources: [{ title, url, domain, summary, status }, ...] }
      const children: TreeNode[] = Array.isArray(data?.sources)
        ? data.sources
            .filter((s: any) => s?.status === 'success')
            .map((s: any, i: number) => ({
              id: `src_${Date.now()}_${i}`,
              title: s?.title || s?.domain || 'Untitled',
              authors: [],
              keywords: s?.domain ? [String(s.domain)] : [],
              summary: typeof s?.summary === 'string' ? s.summary : String(s?.summary ?? ''),
              children: [],
            }))
        : [];

      // 4) Merge children first, THEN arm the animation pass for children
      setTreeData(prev => (prev ? { ...prev, children, summary: `Results for: ${title}` } : prev));
      setAwaitingChildrenDraw(true); // next onRendered corresponds to children draw
      setRendered(false);            // makes firstTime=true only for the CHILDREN pass
    } catch (e) {
      // On error, stop overlay and show message
      console.error(e);
      setIsWatering(false);
      setAwaitingChildrenDraw(false);
      setTreeData(prev => (prev ? { ...prev, summary: 'Error retrieving results.' } : prev));
    }
  };

  // 🗑️ Simple delete handler (demo)
  const handleDelete = () => {
    if (confirm(`Delete ${treeName}?`)) {
      alert(`${treeName} deleted 🌳`);
      router.push('/library');
    }
  };

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Header Controls */}
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

      {/* Watering Animation Overlay */}
      <WateringOverlay show={isWatering} />

      {/* 🌳 The Tree Visualization Canvas */}
      <TreeCanvas
        activeTab={treeName}
        data={treeData}
        firstTime={firstTime}
        onNodeClick={(n) => setPopupNode(n)}
        onWatering={setIsWatering} // TreeCanvas may temporarily toggle during its own animations
        onRendered={() => {
          // Ignore the seed render. Stop only after the children pass completes.
          if (awaitingChildrenDraw) {
            setAwaitingChildrenDraw(false); // the children draw just finished
            setRendered(true);
            setIsWatering(false);          // hide overlay now
          }
        }}
      />

      {/* 🌱 Input box appears when no treeData exists */}
      <BlankTreeInput visible={!treeData} onSubmit={submitPaper} />

      {/* 📚 Sidebar for showing node info */}
      <Sidebar node={popupNode} onClose={() => setPopupNode(null)} />
    </main>
  );
}
