'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import interact from 'interactjs';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

// --- Sample data ---
const data = {
  id: 'seed',
  title: 'Seed Paper: Climate Change Impact',
  authors: ['Dr. Jane Doe', 'Prof. Alan White'],
  keywords: ['climate change', 'temperature rise', 'carbon emissions'],
  summary:
    'This foundational study explores global patterns of temperature rise and its correlation with emission trends across continents.',
  children: [
    {
      id: 'a',
      title: 'Paper A: Carbon Emission Trends',
      authors: ['Dr. Sam Green', 'Dr. Naomi Clarke'],
      keywords: ['carbon trends', 'urban data', 'industrial emissions'],
      summary:
        'Analyzes carbon emissions from 2000–2020, highlighting industrial and urban CO₂ output patterns, and policy effectiveness.',
      children: [
        {
          id: 'a1',
          title: 'Study A1: Urban Emission Analysis',
          authors: ['L. Wong', 'M. Patel'],
          keywords: ['urban emission', 'megacities', 'transport'],
          summary:
            'Evaluates city-level CO₂ emissions, correlating transport activity and energy consumption with air quality shifts.',
        },
        {
          id: 'a2',
          title: 'Study A2: Global Emission Policies',
          authors: ['K. Lee', 'S. Ahmed'],
          keywords: ['emission policy', 'global metrics', 'data modeling'],
          summary:
            'Analyzes global emission policy effectiveness using data-driven modeling and regional comparison.',
        },
      ],
    },
    {
      id: 'b',
      title: 'Paper B: Renewable Energy Growth',
      authors: ['Dr. Clara Sun', 'R. Osei'],
      keywords: ['renewable energy', 'solar power', 'hydroelectric'],
      summary:
        'Investigates renewable adoption globally, tracking solar, wind, and hydro growth from 2010–2025, highlighting economic transitions.',
    },
    {
      id: 'c',
      title: 'Paper C: Ocean Carbon Cycle Studies',
      authors: ['Dr. Li Fang', 'A. Santos'],
      keywords: ['carbon cycle', 'oceanography', 'climate modeling'],
      summary:
        'Explores how the ocean acts as a major carbon sink and its response to global temperature changes.',
    },
    {
      id: 'd',
      title: 'Paper D: Atmospheric Methane Analysis',
      authors: ['Dr. R. Singh', 'C. Garcia'],
      keywords: ['methane', 'atmosphere', 'greenhouse gases'],
      summary:
        'Examines methane’s role in global warming, focusing on atmospheric measurement methods and mitigation approaches.',
    },
  ],
};

export default function VisualizePage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [popupNode, setPopupNode] = useState<any | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
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

    // Zoom + pan
    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 5]) // more flexible zoom
      .translateExtent([
        [-width * 2, -height * 2],   // far larger pan bounds
        [width * 3, height * 3],
      ])
      .filter((event) => {
        // disable zoom on right-click or shift-click
        return !event.button && !event.shiftKey;
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Apply zoom behavior
    svg.call(zoom);

    // Start centered on the seed (original behavior)
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(0, 0) // no forced offset
        .scale(1)        // original zoom level
    );

    // Visual feedback for dragging
    svg
      .on('mousedown', () => svg.style('cursor', 'grabbing'))
      .on('mouseup', () => svg.style('cursor', 'grab'));

    // Tree layout
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([240, 220]);
    treeLayout(root);
    root.descendants().forEach((d: any) => {
      if (!d.children) d.y += Math.random() * 40 - 20;
    });

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
      .attr(
        'd',
        `${hillPath}
         L ${seedX + hillWidth / 2}, ${seedY + hillDepth}
         Q ${seedX}, ${seedY + hillDepth + 40}, ${seedX - hillWidth / 2}, ${seedY + hillDepth}
         Z`
      )
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

    // --- Links and Nodes ---
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
          .attr('stroke-dashoffset', len);
      })
      .transition()
      .delay((_, i) => 900 + i * 150)
      .duration(900)
      .attr('stroke-dashoffset', 0);

    const nodes = nodeGroup
      .selectAll('g.node')
      .data(root.descendants(), (d: any) => d.data.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x + seedX}, ${seedY - 60})`)
      .style('opacity', 0)
      .style('pointer-events', 'all')
      .on('click', function (_, d: any) {
        setPopupNode(d.data);
        setSelectedNodeId(d.data.id);

        // Subtle pulse animation
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

    // Hover interactions
    nodes
      .on('mouseover', function () {
        d3.select(this).select('circle').transition().duration(150).attr('r', 30).attr('fill', '#86efac');
      })
      .on('mouseout', function (e, d: any) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(150)
          .attr('r', (d: any) => (d.depth === 0 ? 30 : 25))
          .attr('fill', d.children ? '#22c55e' : '#bbf7d0');
      });

    interact('.node').draggable(false);
  }, []);

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-40">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Tree Visualization */}
      <motion.div
        animate={{ x: popupNode ? -100 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <svg ref={svgRef}></svg>
      </motion.div>

      {/* Sidebar Drawer */}
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

            {/* ✨ Animated content area */}
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
