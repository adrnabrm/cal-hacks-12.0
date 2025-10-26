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

  const [treeData, setTreeData] = useState<TreeNode | null>(exampleTree);
  const [popupNode, setPopupNode] = useState<TreeNode | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [treeName, setTreeName] = useState<string>('Research Tree');

  // Parse tree name and number from URL (sent by library)
  useEffect(() => {
    if (id) {
      const decoded = decodeURIComponent(id.toString());
      const formatted = decoded.replace(/-/g, ' ');
      setTreeName(formatted);
    }
  }, [id]);

  const firstTime = useMemo(() => !rendered, [rendered]);

  const submitPaper = (title: string) => {
    setTreeData({
      id: 'seed',
      title: `Seed Paper: ${title}`,
      authors: ['Placeholder Author'],
      keywords: ['placeholder'],
      summary: 'Placeholder summary for testing.',
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
      {/* UI Layer */}
      <div className="relative z-[100] pointer-events-auto">
        {/* Header Buttons */}
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

        {/* Tree Title */}
        <div className="absolute top-4 right-4 bg-white/80 px-4 py-2 rounded-full shadow text-green-800 font-semibold">
          {treeName}
        </div>
      </div>

      {/* Watering Animation */}
      <WateringOverlay show={isWatering} />

      {/* Tree Visualization */}
      <TreeCanvas
        activeTab={treeName} // just pass name for now
        data={treeData}
        firstTime={firstTime}
        onNodeClick={(n) => setPopupNode(n)}
        onWatering={setIsWatering}
        onRendered={() => setRendered(true)}
      />

      {/* Empty State */}
      <BlankTreeInput visible={!treeData} onSubmit={submitPaper} />

      {/* Sidebar */}
      <Sidebar node={popupNode} onClose={() => setPopupNode(null)} />
    </main>
  );
}
