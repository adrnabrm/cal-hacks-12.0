'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import interact from 'interactjs';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

// 🌿 Mock dataset
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
      title: 'Paper B: Renewable Energy Growth',
      authors: ['Dr. Clara Sun', 'R. Osei'],
      keywords: ['renewable energy', 'solar power', 'hydroelectric'],
      summary:
        'Investigates renewable adoption globally, tracking solar, wind, and hydro growth from 2010–2025, highlighting economic transitions.',
    },
    {
      id: 'b',
      title: 'Paper B: Renewable Energy Growth',
      authors: ['Dr. Clara Sun', 'R. Osei'],
      keywords: ['renewable energy', 'solar power', 'hydroelectric'],
      summary:
        'Investigates renewable adoption globally, tracking solar, wind, and hydro growth from 2010–2025, highlighting economic transitions.',
    },
  ],
};

export default function VisualizePage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [popupNode, setPopupNode] = useState<any | null>(null);

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

    // 🌍 zoom + pan setup
    const zoom = d3
      .zoom()
      .scaleExtent([0.6, 2])
      .translateExtent([
        [0, -100],
        [width, height - 120],
      ])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    // 🌳 D3 tree layout
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([width - 400, height - 300]);
    treeLayout(root);

    const seedY = height - 100;
    const yScale = d3.scaleLinear().domain([0, height]).range([seedY - 80, 50]);
    const seedX = root.x + 200;

    // 🌿 Ground and stem animation
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

    // Draw soil
    const soil = ground
      .append('path')
      .attr(
        'd',
        `${hillPath} 
         L ${seedX + hillWidth / 2}, ${seedY + hillDepth}
         Q ${seedX}, ${seedY + hillDepth + 40}, ${seedX - hillWidth / 2}, ${seedY + hillDepth}
         Z`
      )
      .attr('fill', 'url(#soil-gradient)')
      .attr('opacity', 0);

    soil
      .transition()
      .delay(200)
      .duration(1000)
      .attr('opacity', 1);

    // Ground outline
    ground
      .append('path')
      .attr('d', hillPath)
      .attr('fill', 'none')
      .attr('stroke', '#78350f')
      .attr('stroke-width', 6)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0)
      .transition()
      .delay(400)
      .duration(800)
      .attr('opacity', 1);

    // Stem growth
    const stem = ground
      .append('line')
      .attr('x1', seedX)
      .attr('x2', seedX)
      .attr('y1', seedY)
      .attr('y2', seedY)
      .attr('stroke', '#166534')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round');

    stem
      .transition()
      .delay(800)
      .duration(1000)
      .attr('y2', seedY - 60);

    // 🌿 Sprouting tree animation
    const linkGroup = treeGroup.append('g').attr('class', 'links');
    const nodeGroup = treeGroup.append('g').attr('class', 'nodes');

    // Create links with animation
    const linkPath = d3
  .linkVertical()
  .x((d: any) => (d?.x ?? 0) + 200)
  .y((d: any) => (d?.y ?? seedY - 60));

    const links = linkGroup
  .selectAll('path.link')
  .data(root.links())
  .enter()
  .append('path')
  .attr('fill', 'none')
  .attr('stroke', '#16a34a')
  .attr('stroke-width', 2)
  .attr('stroke-dasharray', '300 300')
  .attr('stroke-dashoffset', 300)
  // Start with links collapsed near the seed
  .attr('d', (d: any) =>
    linkPath({
      source: { x: d?.source?.x ?? 0, y: seedY - 60 },
      target: { x: d?.source?.x ?? 0, y: seedY - 60 },
    })
  );


    links
      .transition()
      .delay((_, i) => 1000 + i * 200)
      .duration(1200)
      .attr('stroke-dashoffset', 0)
      .attr('d', d3.linkVertical().x((d: any) => d.x + 200).y((d: any) => yScale(d.y)));

    // Create nodes with bloom effect
    const nodes = nodeGroup
      .selectAll('g.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x + 200}, ${seedY - 60})`)
      .style('opacity', 0);

    nodes
      .transition()
      .delay((_, i) => 1500 + i * 300)
      .duration(1000)
      .style('opacity', 1)
      .attr('transform', (d) => `translate(${d.x + 200}, ${yScale(d.y)})`);

    nodes
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d: any) => (d.children ? '#22c55e' : '#bbf7d0'))
      .attr('stroke', '#166534')
      .attr('stroke-width', 2)
      .transition()
      .delay((_, i) => 1500 + i * 300)
      .duration(1000)
      .attr('r', (d: any) => (d.depth === 0 ? 30 : 25));

    // --- Titles (Auto-resize dynamic boxes) ---
    const labelGroups = nodes.append('g').attr('class', 'label-group').attr('transform', 'translate(0, -45)');

    labelGroups.each(function (d: any) {
      const group = d3.select(this);
      const title = d.data.title;

      // measure text width dynamically
      const tempText = group
        .append('text')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('font-family', '"Georgia", "Times New Roman", serif')
        .text(title);

      const textWidth = (tempText.node() as SVGTextElement).getBBox().width;
      tempText.remove();

      const padding = 10;
      const boxWidth = Math.min(textWidth + padding * 2, 220);
      const boxHeight = 28;

      // background rectangle
      group
        .append('rect')
        .attr('x', -boxWidth / 2)
        .attr('y', -boxHeight / 2)
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('opacity', 0.9)
        .attr('stroke', '#bbf7d0')
        .attr('stroke-width', 1.5);

      // text label
      group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('fill', '#166534')
        .attr('font-family', '"Georgia", "Times New Roman", serif')
        .attr('dy', 4)
        .text(title.length > 35 ? title.slice(0, 32) + '...' : title);
    });

    // --- Interactions ---
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
      })
      .on('click', (_, d: any) => setPopupNode(d.data));

    interact('.node').draggable({
      listeners: {
        move(event) {
          const target = event.target;
          const transform = d3.select(target).attr('transform');
          const match = /translate\(([^,]+),([^\)]+)\)/.exec(transform);
          if (!match) return;
          const x = parseFloat(match[1]) + event.dx;
          const y = parseFloat(match[2]) + event.dy;
          d3.select(target).attr('transform', `translate(${x},${y})`);
        },
      },
    });
  }, []);

  return (
    <main className="w-screen h-screen text-green-900 relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-40">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Tree */}
      <motion.div
        animate={{ x: popupNode ? -150 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <svg ref={svgRef}></svg>
      </motion.div>

      {/* Popup Info Card */}
      <AnimatePresence>
        {popupNode && (
          <motion.div
            key="popup-card"
            initial={{ opacity: 0, x: 150 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 150 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute top-1/2 right-[15%] -translate-y-1/2 w-[420px] bg-white border border-green-100 rounded-2xl shadow-2xl p-6 z-50"
          >
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-2xl font-semibold text-green-800">{popupNode.title}</h2>
              <button onClick={() => setPopupNode(null)}>
                <X className="w-5 h-5 text-green-700 hover:text-green-900" />
              </button>
            </div>

            <p className="text-sm text-green-600 mb-2">
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
        )}
      </AnimatePresence>
    </main>
  );
}
