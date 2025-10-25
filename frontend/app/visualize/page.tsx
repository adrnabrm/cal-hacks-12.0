'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import interact from 'interactjs';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Plus, Trash2, Pencil, Check } from 'lucide-react';

// --- Full Example Tree ---
const exampleTree = {
  id: 'seed1',
  title: 'Seed Paper: Climate Change Impact',
  authors: ['Dr. Jane Doe', 'Prof. Alan White'],
  keywords: ['climate change', 'temperature rise', 'carbon emissions'],
  summary:
    'Explores global patterns of temperature rise and its correlation with emission trends across continents.',
  children: [
    {
      id: 'a',
      title: 'Paper A: Carbon Emission Trends',
      authors: ['Sam Green'],
      keywords: ['carbon'],
      summary: 'Emission trend analysis.',
      children: [
        { id: 'a1', title: 'Paper C: Renewable Models', authors: ['Clara Sun'], keywords: ['modeling'], summary: 'Simulation improvements.' },
        { id: 'a2', title: 'Paper D: Global Policies', authors: ['Mark Liu'], keywords: ['policy'], summary: 'Policy framework evaluations.' },
        { id: 'a3', title: 'Paper E: Urban Studies', authors: ['Anna Reyes'], keywords: ['urban'], summary: 'City emission analysis.' },
        { id: 'a4', title: 'Paper F: Climate Metrics', authors: ['Leo Tan'], keywords: ['metrics'], summary: 'Environmental measurement techniques.' },
        { id: 'a5', title: 'Paper G: Carbon Capture', authors: ['Kai Zhang'], keywords: ['capture'], summary: 'Carbon capture innovations.' },
      ],
    },
    {
      id: 'b',
      title: 'Paper B: Climate Modeling Innovations',
      authors: ['Clara Sun'],
      keywords: ['modeling'],
      summary: 'Simulation improvements.',
      children: [
        {
          id: 'b1',
          title: 'Paper C: Ocean Temperature Data',
          authors: ['L. Chen'],
          keywords: ['data', 'temperature'],
          summary: 'Analyzing temperature datasets.',
        },
      ],
    },
  ],
};

export default function VisualizePage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [trees, setTrees] = useState<Record<string, any>>({
    new_tree: null,
    example_tree: exampleTree,
  });
  const [tabNames, setTabNames] = useState<Record<string, string>>({
    new_tree: 'New Tree',
    example_tree: 'Example Tree',
  });
  const [activeTab, setActiveTab] = useState('new_tree');
  const [popupNode, setPopupNode] = useState<any | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [newTabName, setNewTabName] = useState('');

  // --- Draw tree visualization ---
  const drawTree = (data: any) => {
    if (!svgRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('cursor', 'grab')
      .style('background', 'linear-gradient(to top, #ecfdf5, #f0fdf4)');
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'zoom-group');
    const treeGroup = g.append('g').attr('class', 'tree-group');

    // --- Zoom + pan ---
    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 5])
      .translateExtent([
        [-width * 2, -height * 2],
        [width * 3, height * 3],
      ])
      .filter((event) => !event.button && !event.shiftKey)
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.scale(1));
    svg.on('mousedown', () => svg.style('cursor', 'grabbing')).on('mouseup', () => svg.style('cursor', 'grab'));

    const seedY = height - 100;
    const seedX = width / 2;

    // --- Ground / Soil ---
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'soil-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#a16207').attr('stop-opacity', 0.4);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#451a03').attr('stop-opacity', 0.8);

    const hillWidth = 800;
    const hillDepth = 120;
    const ground = treeGroup.append('g');
    const hillPath = d3
      .line()
      .curve(d3.curveCatmullRom.alpha(0.5))([
        [seedX - hillWidth / 2, seedY],
        [seedX - hillWidth / 3, seedY - 25],
        [seedX, seedY - 35],
        [seedX + hillWidth / 3, seedY - 25],
        [seedX + hillWidth / 2, seedY],
      ]);

    ground
      .append('path')
      .attr('d', `${hillPath} L ${seedX + hillWidth / 2}, ${seedY + hillDepth} Q ${seedX}, ${seedY + hillDepth + 40}, ${seedX - hillWidth / 2}, ${seedY + hillDepth} Z`)
      .attr('fill', 'url(#soil-gradient)')
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    ground
      .append('path')
      .attr('d', hillPath)
      .attr('fill', 'none')
      .attr('stroke', '#78350f')
      .attr('stroke-width', 6)
      .attr('stroke-linecap', 'round');

    const stem = ground
      .append('line')
      .attr('x1', seedX)
      .attr('x2', seedX)
      .attr('y1', seedY)
      .attr('y2', seedY)
      .attr('stroke', '#166534')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round');
    stem.transition().delay(800).duration(1000).attr('y2', seedY - 60);

    // Stop here if tree is blank
    if (!data) return;

    // --- Tree structure ---
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([240, 220]);
    treeLayout(root);
    root.descendants().forEach((d: any) => {
      if (!d.children) d.y += Math.random() * 40 - 20;
    });

    const linkGroup = treeGroup.append('g').attr('class', 'links');
    const nodeGroup = treeGroup.append('g').attr('class', 'nodes');

    const bezierLink = (d: any) => {
      const radius = 25;
      const sx = d.source.x + seedX;
      const sy = seedY - d.source.y + (d.source.depth === 0 ? radius : 0);
      const tx = d.target.x + seedX;
      const ty = seedY - d.target.y - radius;
      const midY = (sy + ty) / 2;
      const siblingOffset = (d.target.x - d.source.x) * 0.3;
      return `M${sx},${sy} C${sx + siblingOffset},${midY} ${tx - siblingOffset},${midY} ${tx},${ty}`;
    };

    // Links
    linkGroup
      .selectAll('path.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#16a34a')
      .attr('stroke-width', 2)
      .attr('d', (d: any) => bezierLink(d))
      .each(function () {
        const len = (this as SVGPathElement).getTotalLength();
        d3.select(this)
          .attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len)
          .transition()
          .delay((_, i) => 900 + i * 150)
          .duration(900)
          .attr('stroke-dashoffset', 0);
      });

    // Nodes
    const nodes = nodeGroup
      .selectAll('g.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x + seedX}, ${seedY - 60})`)
      .style('opacity', 0)
      .style('pointer-events', 'all')
      .on('click', function (_, d: any) {
        setPopupNode(d.data);
        setSelectedNodeId(d.data.id);
        const circle = d3.select(this).select('circle');
        circle
          .transition()
          .duration(150)
          .attr('r', 35)
          .transition()
          .duration(250)
          .attr('r', d.depth === 0 ? 30 : 25);
      });

    nodes
      .transition()
      .delay((_, i) => 1100 + i * 200)
      .duration(600)
      .style('opacity', 1)
      .attr('transform', (d) => `translate(${d.x + seedX}, ${seedY - d.y})`);

    nodes
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d: any) => (d.children ? '#22c55e' : '#bbf7d0'))
      .attr('stroke', '#166534')
      .attr('stroke-width', 2)
      .transition()
      .delay((_, i) => 1200 + i * 200)
      .duration(500)
      .attr('r', (d: any) => (d.depth === 0 ? 30 : 25));

    // Labels
    const labelGroups = nodes.append('g').attr('class', 'label-group').attr('transform', 'translate(0, -45)');
    labelGroups.each(function (d: any) {
      const group = d3.select(this);
      const title = d.data.title;
      const temp = group
        .append('text')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('font-family', '"Georgia", "Times New Roman", serif')
        .text(title);
      const width = (temp.node() as SVGTextElement).getBBox().width + 20;
      temp.remove();

      const siblings = d.parent?.children || [];
      if (siblings.length > 1) {
        const index = siblings.indexOf(d);
        const offset = (index - (siblings.length - 1) / 2) * 15;
        group.attr('transform', `translate(${offset}, -45)`);
      }

      group
        .append('rect')
        .attr('x', -width / 2)
        .attr('y', -15)
        .attr('width', width)
        .attr('height', 28)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('opacity', 0.9)
        .attr('stroke', '#bbf7d0')
        .attr('stroke-width', 1.5);

      group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('fill', '#166534')
        .attr('font-family', '"Georgia", "Times New Roman", serif')
        .attr('dy', 5)
        .text(title);
    });

    interact('.node').draggable(false);
  };

  // --- Lifecycle ---
  // --- Lifecycle ---
  useEffect(() => {
    // Close any open sidebar when switching trees
    setPopupNode(null);

  // Draw the new tree
  drawTree(trees[activeTab]);
}, [activeTab, trees]);


  // --- Tab management ---
  const handleAddTree = () => {
    if (Object.keys(trees).length >= 5) {
      alert('You can only have up to 5 trees.');
      return;
    }
    const newId = `tree_${Date.now()}`;
    setTrees((prev) => ({ ...prev, [newId]: null }));
    setTabNames((prev) => ({ ...prev, [newId]: `Tree ${Object.keys(prev).length + 1}` }));
    setActiveTab(newId);
  };

  const handleDeleteTree = (id: string) => {
    if (!confirm(`Delete "${tabNames[id]}"? This cannot be undone.`)) return;
    const updatedTrees = { ...trees };
    const updatedNames = { ...tabNames };
    delete updatedTrees[id];
    delete updatedNames[id];
    setTrees(updatedTrees);
    setTabNames(updatedNames);
    const nextTab = Object.keys(updatedTrees)[0] || '';
    setActiveTab(nextTab);
  };

  const startRenaming = (id: string) => {
    setEditingTab(id);
    setNewTabName(tabNames[id]);
  };

  const confirmRename = (id: string) => {
    setTabNames((prev) => ({ ...prev, [id]: newTabName || prev[id] }));
    setEditingTab(null);
  };

  // --- Paper input placeholder ---
  const handleSubmitPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newTree = {
      id: 'seed',
      title: `Seed Paper: ${inputValue}`,
      authors: ['Placeholder Author'],
      keywords: ['placeholder'],
      summary: 'Placeholder summary — backend will fill in real data later.',
      children: [],
    };
    setTrees((prev) => ({ ...prev, [activeTab]: newTree }));
    setInputValue('');
  };

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Back */}
      <div className="absolute top-4 left-4 z-40">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Tabs */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-40 flex-wrap justify-center">
        {Object.entries(trees).map(([key]) => (
          <div key={key} className="flex items-center gap-1 bg-white rounded-full shadow px-2 py-1">
            {editingTab === key ? (
              <>
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename(key)}
                  className="border border-green-300 rounded-full px-2 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-green-500"
                  autoFocus
                />
                <button onClick={() => confirmRename(key)}>
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${
                    activeTab === key ? 'bg-green-600 text-white' : 'bg-green-100 hover:bg-green-200 text-green-700'
                  }`}
                >
                  {tabNames[key] || 'Untitled Tree'}
                </button>
                <button onClick={() => startRenaming(key)} title="Rename">
                  <Pencil className="w-4 h-4 text-green-600 hover:text-green-800" />
                </button>
                <button onClick={() => handleDeleteTree(key)} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800" />
                </button>
              </>
            )}
          </div>
        ))}

        <button
          onClick={handleAddTree}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Tree
        </button>
      </div>

      <svg ref={svgRef} className="absolute inset-0 block" />

      {/* Placeholder */}
      {!trees[activeTab] && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-30">
          <p className="text-lg text-green-800 mb-3">
            🌱 This tree is empty. Add your first research paper below.
          </p>
          <form onSubmit={handleSubmitPaper} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter paper title..."
              className="border border-green-300 rounded-lg px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
            >
              Add Paper
            </button>
          </form>
        </div>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {popupNode && (
          <motion.div
            key="sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-green-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-green-100 bg-green-50">
              <h2 className="text-2xl font-semibold text-green-800">{popupNode.title}</h2>
              <button onClick={() => setPopupNode(null)}>
                <X className="w-6 h-6 text-green-700 hover:text-green-900" />
              </button>
            </div>

            <motion.div
              key={popupNode.id}
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-6 overflow-y-auto flex-1"
            >
              <p className="text-sm text-green-600 mb-3">
                <strong>Authors:</strong> {popupNode.authors.join(', ')}
              </p>
              <div className="text-sm text-green-700 mb-4">
                <strong>Abstract:</strong>
                <div
                  className="bg-green-50 border border-green-100 rounded p-2 mt-1"
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight(popupNode.summary, { language: 'plaintext' }).value,
                  }}
                />
              </div>
              <div className="text-sm text-green-700">
                <strong>Keywords / Similarities:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {popupNode.keywords.map((kw: string, i: number) => (
                    <li key={i}>{kw}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
