import { TreeNode } from './types';

export const exampleTree: TreeNode = {
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

