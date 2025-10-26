'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import interact from 'interactjs';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Plus, Trash2, Pencil, Check } from 'lucide-react';

// --- Example Tree ---
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
  const [inputValue, setInputValue] = useState('');
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [isWatering, setIsWatering] = useState(false);
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set());

  // --- Draw Tree ---
  const drawTree = (tabId: string, data: any, firstTime: boolean) => {
    if (!svgRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', 'linear-gradient(to top, #ecfdf5, #f0fdf4)');
    svg.selectAll('*').remove();

    const g = svg.append('g');
    const treeGroup = g.append('g');

    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 5])
      .translateExtent([
        [-width * 2, -height * 2],
        [width * 3, height * 3],
      ])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const seedY = height - 100;
    const seedX = width / 2;

    // --- Soil / Ground ---
    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'soil-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#a16207').attr('stop-opacity', 0.4);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#451a03').attr('stop-opacity', 0.8);

    const hillPath = d3
      .line()
      .curve(d3.curveCatmullRom.alpha(0.5))([
        [seedX - 400, seedY],
        [seedX - 200, seedY - 25],
        [seedX, seedY - 35],
        [seedX + 200, seedY - 25],
        [seedX + 400, seedY],
      ]);

    const ground = treeGroup.append('g');
    ground
      .append('path')
      .attr('d', `${hillPath} L ${seedX + 400}, ${seedY + 120} Q ${seedX}, ${seedY + 160}, ${seedX - 400}, ${seedY + 120} Z`)
      .attr('fill', 'url(#soil-gradient)');
    ground
      .append('path')
      .attr('d', hillPath)
      .attr('fill', 'none')
      .attr('stroke', '#78350f')
      .attr('stroke-width', 6);

    const stem = ground
      .append('line')
      .attr('x1', seedX)
      .attr('x2', seedX)
      .attr('y1', seedY)
      .attr('y2', firstTime ? seedY : seedY - 60)
      .attr('stroke', '#166534')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round');
    if (firstTime) stem.transition().duration(1000).attr('y2', seedY - 60);

    if (!data) return;

    const root = d3.hierarchy(data);
    const layout = d3.tree().nodeSize([240, 220]);
    layout(root);

    const linkGroup = treeGroup.append('g');
    const nodeGroup = treeGroup.append('g');

    const bezier = (d: any) => {
      const sx = d.source.x + seedX,
        sy = seedY - d.source.y,
        tx = d.target.x + seedX,
        ty = seedY - d.target.y;
      const midY = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    };

    // --- Animate Links (Branches) ---
    const links = linkGroup
      .selectAll('path')
      .data(root.links())
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#16a34a')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('d', (d) => {
        const sx = d.source.x + seedX,
          sy = seedY - d.source.y;
        return `M${sx},${sy}C${sx},${sy} ${sx},${sy} ${sx},${sy}`;
      });

    if (firstTime) {
      links
        .transition()
        .delay((_, i) => i * 150)
        .duration(700)
        .attrTween('d', function (d) {
          const sx = d.source.x + seedX,
            sy = seedY - d.source.y,
            tx = d.target.x + seedX,
            ty = seedY - d.target.y;
          const midY = (sy + ty) / 2;
          const interp = d3.interpolateNumber(0, 1);
          return function (t) {
            const p = interp(t);
            const cx1 = sx;
            const cy1 = sy + (midY - sy) * p;
            const cx2 = tx;
            const cy2 = ty - (ty - midY) * (1 - p);
            const x = sx + (tx - sx) * p;
            const y = sy + (ty - sy) * p;
            return `M${sx},${sy} C${cx1},${cy1} ${cx2},${cy2} ${x},${y}`;
          };
        });
    } else {
      links.attr('d', (d) => bezier(d));
    }

    // --- Nodes ---
    const nodes = nodeGroup
      .selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x + seedX},${seedY - d.y})`)
      .on('click', (_, d: any) => setPopupNode(d.data));

    if (firstTime) {
      let done = 0;
      const total = root.descendants().length;
      setIsWatering(true);

      nodes
        .append('circle')
        .attr('r', 0)
        .attr('fill', (d: any) => (d.children ? '#22c55e' : '#bbf7d0'))
        .attr('stroke', '#166534')
        .attr('stroke-width', 2)
        .transition()
        .delay((_, i) => 300 + i * 150)
        .duration(500)
        .attr('r', (d: any) => (d.depth === 0 ? 30 : 25))
        .on('end', () => {
          done++;
          if (done === total) {
            setIsWatering(false);
            setRenderedTabs((prev) => new Set(prev).add(tabId));
          }
        });
    } else {
      nodes
        .append('circle')
        .attr('r', (d: any) => (d.depth === 0 ? 30 : 25))
        .attr('fill', (d: any) => (d.children ? '#22c55e' : '#bbf7d0'))
        .attr('stroke', '#166534')
        .attr('stroke-width', 2);
    }

    // --- Labels ---
    const labels = nodes.append('g').attr('transform', 'translate(0,-45)');
    labels.each(function (d: any, i) {
      const g = d3.select(this);
      const t = g.append('text').text(d.data.title).attr('font-size', 13).attr('font-weight', 600);
      const w = (t.node() as SVGTextElement).getBBox().width + 20;
      t.remove();
      g.append('rect')
        .attr('x', -w / 2)
        .attr('y', -15)
        .attr('width', w)
        .attr('height', 28)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('opacity', 0.9);
      const text = g
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('fill', '#166534')
        .attr('dy', 5)
        .attr('opacity', firstTime ? 0 : 1)
        .text(d.data.title);

      if (firstTime) {
        text
          .transition()
          .delay(700 + i * 150)
          .duration(400)
          .attr('opacity', 1)
          .attr('transform', 'translate(0,-5)');
      }
    });
  };

  // --- Lifecycle ---
  useEffect(() => {
    setPopupNode(null);
    const firstTime = !renderedTabs.has(activeTab);
    drawTree(activeTab, trees[activeTab], firstTime);
  }, [activeTab, trees]);

  // --- Tab handlers ---
  const addTree = () => {
    if (Object.keys(trees).length >= 5) return alert('Max 5 trees');
    const id = `tree_${Date.now()}`;
    setTrees({ ...trees, [id]: null });
    setTabNames({ ...tabNames, [id]: `Tree ${Object.keys(trees).length + 1}` });
    setActiveTab(id);
  };
  const delTree = (id: string) => {
    if (!confirm(`Delete ${tabNames[id]}?`)) return;
    const newTrees = { ...trees };
    const newNames = { ...tabNames };
    delete newTrees[id];
    delete newNames[id];
    setTrees(newTrees);
    setTabNames(newNames);
    setRenderedTabs((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
    setActiveTab(Object.keys(newTrees)[0]);
  };
  const renameTree = (id: string) => {
    setEditingTab(id);
    setNewTabName(tabNames[id]);
  };
  const confirmRename = (id: string) => {
    setTabNames({ ...tabNames, [id]: newTabName || tabNames[id] });
    setEditingTab(null);
  };

  const submitPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setTrees({
      ...trees,
      [activeTab]: {
        id: 'seed',
        title: `Seed Paper: ${inputValue}`,
        authors: ['Placeholder Author'],
        keywords: ['placeholder'],
        summary: 'Placeholder summary for testing.',
        children: [],
      },
    });
    setInputValue('');
  };

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* === CLICKABLE UI LAYER === */}
      <div className="relative z-[100] pointer-events-auto">
        {/* Back */}
        <div className="absolute top-4 left-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* Tabs */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 justify-center">
          {Object.keys(trees).map((key) => (
            <div key={key} className="flex items-center bg-white rounded-full shadow px-2 py-1">
              {editingTab === key ? (
                <>
                  <input
                    className="border border-green-300 rounded-full px-2 text-sm w-28 focus:ring-1 focus:ring-green-500"
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename(key)}
                  />
                  <button onClick={() => confirmRename(key)}>
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-1 rounded-full font-semibold ${
                      activeTab === key
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    {tabNames[key]}
                  </button>
                  <button onClick={() => renameTree(key)}>
                    <Pencil className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => delTree(key)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={addTree}
            disabled={Object.keys(trees).length >= 5}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add Tree
          </button>
        </div>
      </div>

      {/* === WATERING + TREE LAYERS === */}
      <AnimatePresence>
        {isWatering && (
          <motion.div
            key="watering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ pointerEvents: 'none' }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center select-none"
          >
            <div className="flex flex-col items-center relative" style={{ pointerEvents: 'none' }}>
              <motion.div
                className="relative left-[-3px]"
                initial={{ rotate: -20 }}
                animate={{ rotate: [-20, -10, -25, -10, -20] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ pointerEvents: 'none' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#166534"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-16 h-16 mb-2"
                >
                  <path d="M18 10V3h-3v7a3 3 0 0 1-6 0V3H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6Z" />
                  <path d="M22 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <line x1="2" y1="19" x2="22" y2="19" />
                </svg>
              </motion.div>

              {/* Droplets */}
              <div className="relative h-24 w-20 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 w-2 h-4 bg-blue-400/80 rounded-full"
                    style={{ transform: 'translateX(-50%)', pointerEvents: 'none' }}
                    initial={{ y: -5, opacity: 0 }}
                    animate={{
                      y: [0, 35, 55],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.25,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-green-800 mt-4 text-lg font-medium"
              style={{ pointerEvents: 'none' }}
            >
              Growing your tree...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Tree Canvas */}
      <svg
        ref={svgRef}
        className={`absolute inset-0 block z-10 ${
          isWatering ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
        style={{ userSelect: 'none' }}
      />

      {/* Blank tree input */}
      {!trees[activeTab] && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[80] text-center">
          <p className="text-lg text-green-800 mb-3">
            🌱 This tree is empty. Add your first research paper below.
          </p>
          <form onSubmit={submitPaper} className="flex gap-2 justify-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter paper title..."
              className="border border-green-300 rounded-lg px-3 py-2 w-80 focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Paper
            </button>
          </form>
        </div>
      )}

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {popupNode && (
          <motion.div
            key="sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-green-200 shadow-2xl z-[120] flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-green-100 bg-green-50">
              <h2 className="text-2xl font-semibold text-green-800">{popupNode.title}</h2>
              <button onClick={() => setPopupNode(null)}>
                <X className="w-6 h-6 text-green-700 hover:text-green-900" />
              </button>
            </div>

            <motion.div
              key={popupNode.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
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
                    __html: hljs.highlight(popupNode.summary, {
                      language: 'plaintext',
                    }).value,
                  }}
                />
              </div>
              <div className="text-sm text-green-700">
                <strong>Keywords:</strong>
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
