'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { TreeNode } from '../lib/types';

interface Props {
  node: TreeNode | null;
  onClose: () => void;
  /** Optional callback — triggers when user selects a section to expand this node */
  onExpand?: (section: string) => void;
}

export default function Sidebar({ node, onClose, onExpand }: Props) {
  if (!node) return null;

  const sections = ['Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion'];

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key="sidebar"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-green-200 shadow-2xl z-[120] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-green-100 bg-green-50">
            <h2 className="text-2xl font-semibold text-green-800">{node.title}</h2>
            <button onClick={onClose} aria-label="Close sidebar">
              <X className="w-6 h-6 text-green-700 hover:text-green-900" />
            </button>
          </div>

          {/* Content */}
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="p-6 overflow-y-auto flex-1"
          >
            {/* Authors */}
            {node.authors && node.authors.length > 0 && (
              <p className="text-sm text-green-600 mb-3">
                <strong>Authors:</strong> {node.authors.join(', ')}
              </p>
            )}

            {/* Summary */}
            <div className="text-sm text-green-700 mb-4">
              <strong>Abstract:</strong>
              <div
                className="bg-green-50 border border-green-100 rounded p-2 mt-1 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: hljs.highlight(node.summary || '', { language: 'plaintext' }).value,
                }}
              />
            </div>

            {/* Keywords */}
            {node.keywords && node.keywords.length > 0 && (
              <div className="text-sm text-green-700 mb-6">
                <strong>Keywords:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {node.keywords.map((kw) => (
                    <li key={kw}>{kw}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expand by section */}
            {onExpand && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-green-700 mb-2">
                  Expand this node by section:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {sections.map((section) => (
                    <button
                      key={section}
                      onClick={() => onExpand(section)}
                      className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-left transition-colors"
                    >
                      ➕ {section}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
