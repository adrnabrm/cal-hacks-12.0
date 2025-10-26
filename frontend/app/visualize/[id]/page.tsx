'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TreeCanvas from '../../../components/TreeCanvas';
import Sidebar from '../../../components/Sidebar';
import WateringOverlay from '../../../components/WateringOverlay';
import BlankTreeInput from '../../../components/BlankTreeInput';
import { exampleTree } from '@/lib/exampleTree';
import { TreeNode } from '@/lib/types';

export default function VisualizePage() {
  const { id } = useParams();
  const router = useRouter();

  // 🌳 This holds your actual tree data for this page
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [popupNode, setPopupNode] = useState<TreeNode | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [treeName, setTreeName] = useState<string>('Research Tree');

  // 🪴 Decode the tree name from the Library URL (e.g., /graphs/Tree-1)
  useEffect(() => {
    if (id) {
      const decoded = decodeURIComponent(id.toString());
      const formatted = decoded.replace(/-/g, ' ');
      setTreeName(formatted);
    }
  }, [id]);

  const firstTime = useMemo(() => !rendered, [rendered]);

  // 🌱 Function that runs when user inputs a paper title
  const submitPaper = (title: string) => {
    // Simulate creating a seed node — this is where you can hook your backend / search logic later
    setTreeData({
      id: 'seed',
      title: `Seed Paper: ${title}`,
      authors: ['Placeholder Author'],
      keywords: ['example', 'testing'],
      summary: 'This is a placeholder summary for demonstration purposes.',
      children: [],
    });
  };

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
        onWatering={setIsWatering}
        onRendered={() => setRendered(true)}
      />

      {/* 🌱 Input box appears when no treeData exists */}
      <BlankTreeInput visible={!treeData} onSubmit={submitPaper} />

      {/* 📚 Sidebar for showing node info */}
      <Sidebar node={popupNode} onClose={() => setPopupNode(null)} />
    </main>
  );
}
