
'use client';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import TreeCanvas from '../../components/TreeCanvas';
import TabsBar from '../../components/TabsBar';
import Sidebar from '../../components/Sidebar';
import WateringOverlay from '../../components/WateringOverlay';
import BlankTreeInput from '../../components/BlankTreeInput';
import { exampleTree } from '../../lib/exampleTree';
import { TabNamesMap, TreesMap, TreeNode } from '../../lib/types';

export default function VisualizePage() {
  const [trees, setTrees] = useState<TreesMap>({
    new_tree: null,
    example_tree: exampleTree,
  });
  const [tabNames, setTabNames] = useState<TabNamesMap>({
    new_tree: 'New Tree',
    example_tree: 'Example Tree',
  });
  const [activeTab, setActiveTab] = useState('new_tree');
  const [popupNode, setPopupNode] = useState<TreeNode | null>(null);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [isWatering, setIsWatering] = useState(false);
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set());

  const firstTime = useMemo(() => !renderedTabs.has(activeTab), [activeTab, renderedTabs]);

  const addTree = () => {
    setTrees((prev) => {
      const count = Object.keys(prev).length;
      if (count >= 5) {
        setTimeout(() =>
          alert('🌳 You’ve reached the maximum of 5 trees. Please delete one before adding another.')
        );
        return prev;
      }
      const id = `tree_${Date.now()}`;
      const name = `Tree ${count + 1}`;
      setTabNames((n) => ({ ...n, [id]: name }));
      setActiveTab(id);
      return { ...prev, [id]: null };
    });
  };

  const delTree = (id: string) => {
    if (!confirm(`Delete ${tabNames[id]}?`)) return;
    setTrees((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTabNames((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRenderedTabs((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
    const remaining = Object.keys(trees).filter((k) => k !== id);
    setActiveTab(remaining[0] || 'new_tree');
  };

  const renameTree = (id: string) => {
    setEditingTab(id);
    setNewTabName(tabNames[id]);
  };

  const confirmRename = (id: string) => {
    setTabNames((prev) => ({ ...prev, [id]: newTabName || prev[id] }));
    setEditingTab(null);
  };

  const submitPaper = (title: string) => {
    const existingKeys = Object.keys(trees);
    let newTrees = { ...trees };
    let newNames = { ...tabNames };
    let currentTab = activeTab;

    if (existingKeys.length === 0 || !newTrees[currentTab]) {
      const newId = `tree_${Date.now()}`;
      const nextNumber = Object.keys(newNames).length + 1;
      newTrees = { ...newTrees, [newId]: null };
      newNames = { ...newNames, [newId]: `Tree ${nextNumber}` };
      currentTab = newId;
      setActiveTab(newId);
    }

    setTrees({
      ...newTrees,
      [currentTab]: {
        id: 'seed',
        title: `Seed Paper: ${title}`,
        authors: ['Placeholder Author'],
        keywords: ['placeholder'],
        summary: 'Placeholder summary for testing.',
        children: [],
      },
    });

    setTabNames(newNames);
  };

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* UI Layer */}
      <div className="relative z-[100] pointer-events-auto">
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* Tabs */}
        <TabsBar
          trees={trees}
          tabNames={tabNames}
          activeTab={activeTab}
          editingTab={editingTab}
          newTabName={newTabName}
          onSetActive={setActiveTab}
          onAdd={addTree}
          onDelete={delTree}
          onStartRename={renameTree}
          onConfirmRename={confirmRename}
          onRenameInput={setNewTabName}
        />
      </div>

      {/* Watering animation */}
      <WateringOverlay show={isWatering} />

      {/* Tree Visualization */}
      <TreeCanvas
        activeTab={activeTab}
        data={trees[activeTab]}
        firstTime={firstTime}
        onNodeClick={(n) => setPopupNode(n)}
        onWatering={setIsWatering}
        onRendered={(id) => setRenderedTabs((prev) => new Set(prev).add(id))}
      />

      {/* Empty state */}
      <BlankTreeInput visible={!trees[activeTab]} onSubmit={submitPaper} />

      {/* Sidebar */}
      <Sidebar node={popupNode} onClose={() => setPopupNode(null)} />
    </main>
  );
}
