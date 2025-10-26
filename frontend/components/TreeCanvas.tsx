'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../lib/types';

interface Props {
  activeTab: string;
  data: TreeNode | null;
  firstTime: boolean;
  onNodeClick: (n: TreeNode) => void;
  onWatering: (v: boolean) => void;
  onRendered: (tabId: string) => void;
}

export default function TreeCanvas({
  activeTab,
  data,
  firstTime,
  onNodeClick,
  onWatering,
  onRendered,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
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
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .translateExtent([
        [-width * 2, -height * 2],
        [width * 3, height * 3],
      ])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom as any);

    const seedY = height - 100;
    const seedX = width / 2;

    // Soil gradient
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

    // Ground + stem
    const hillPath = d3
      .line<number[]>()
      .curve(d3.curveCatmullRom.alpha(0.5))(
        [
          [seedX - 400, seedY],
          [seedX - 200, seedY - 25],
          [seedX, seedY - 35],
          [seedX + 200, seedY - 25],
          [seedX + 400, seedY],
        ] as any
      );

    const ground = treeGroup.append('g');
    ground
      .append('path')
      .attr(
        'd',
        `${hillPath} L ${seedX + 400}, ${seedY + 120} Q ${seedX}, ${seedY + 160}, ${seedX - 400}, ${seedY + 120} Z`
      )
      .attr('fill', 'url(#soil-gradient)');
    ground.append('path').attr('d', hillPath!).attr('fill', 'none').attr('stroke', '#78350f').attr('stroke-width', 6);

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

    // Layout
    const root = d3.hierarchy<TreeNode>(data);
    const layout = d3.tree<TreeNode>().nodeSize([240, 220]);
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

    // Links
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
      links.attr('d', (d: any) => bezier(d));
    }

    // Nodes
    const nodes = nodeGroup
      .selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x + seedX},${seedY - d.y})`)
      .on('click', (_, d: any) => onNodeClick(d.data));

    if (firstTime) {
      let done = 0;
      const total = root.descendants().length;
      onWatering(true);

      nodes
        .append('circle')
        .attr('r', 0)
        .attr('fill', (d: any) => (d.depth === 0 ? '#22c55e' : '#bbf7d0'))
        .attr('stroke', '#166534')
        .attr('stroke-width', 2)
        .transition()
        .delay((_, i) => 300 + i * 150)
        .duration(500)
        .attr('r', (d: any) => (d.depth === 0 ? 30 : 25))
        .on('end', () => {
          done++;
          if (done === total) {
            onWatering(false);
            onRendered(activeTab);
          }
        });
    } else {
      nodes
        .append('circle')
        .attr('r', (d: any) => (d.depth === 0 ? 30 : 25))
        .attr('fill', (d: any) => (d.depth === 0 ? '#22c55e' : '#bbf7d0'))
        .attr('stroke', '#166534')
        .attr('stroke-width', 2);
    }

    // Labels
    const labels = nodes.append('g').attr('transform', 'translate(0,-45)');
    labels.each(function (d: any, i) {
      const g = d3.select(this);
      const title = d.data.results_json?.title || '(No title)';
      const t = g.append('text').text(title).attr('font-size', 13).attr('font-weight', 600);
      const w = (t.node() as SVGTextElement).getBBox().width + 20;
      t.remove();

      const box = g
        .append('rect')
        .attr('x', -w / 2)
        .attr('y', -15)
        .attr('width', w)
        .attr('height', 28)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('opacity', firstTime ? 0 : 0.9);

      const text = g
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('fill', '#166534')
        .attr('dy', 5)
        .attr('opacity', firstTime ? 0 : 1)
        .text(title);

      if (firstTime) {
        box
          .transition()
          .delay(800 + i * 150)
          .duration(400)
          .attr('opacity', 0.9);
        text
          .transition()
          .delay(850 + i * 150)
          .duration(400)
          .attr('opacity', 1)
          .attr('transform', 'translate(0,-5)');
      }
    });
  }, [activeTab, data, firstTime, onNodeClick, onRendered, onWatering]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 block z-10"
      style={{ userSelect: 'none' }}
    />
  );
}
