'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Plus, Trash2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LibraryPage() {
  const [trees, setTrees] = useState([
    { id: 'tree1', name: 'Tree 1 — Climate Change Impact' },
    { id: 'tree2', name: 'Tree 2 — Renewable Energy Systems' },
  ]);

  const router = useRouter();
  const MAX_TREES = 15;

  const handleCreateTree = () => {
    if (trees.length >= MAX_TREES) {
      alert('🌳 You have reached the maximum amount of trees.');
      return;
    }

    const newId = `tree${trees.length + 1}`;
    const newTree = { id: newId, name: `Tree ${trees.length + 1}` };
    setTrees([...trees, newTree]);
  };

  const handleDeleteTree = (id: string) => {
    setTrees(trees.filter((t) => t.id !== id));
  };

  const handleOpenTree = (id: string) => {
    router.push(`/graphs/${id}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mb-10 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Leaf className="text-green-600 w-10 h-10" />
          <h1 className="text-3xl font-bold text-green-800">Your Research Library</h1>
        </div>
        <p className="text-green-700 max-w-2xl mx-auto">
          Manage your growing forest of research trees. Create, view, and organize your projects.
        </p>
      </motion.header>

      {/* Tree Cards Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full"
      >
        <AnimatePresence>
          {trees.map((tree) => (
            <motion.div
              key={tree.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white border border-green-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleOpenTree(tree.id)}
            >
              <div className="flex flex-col items-center text-center">
                <BookOpen className="text-green-700 w-10 h-10 mb-3" />
                <h2 className="text-lg font-semibold text-green-800">{tree.name}</h2>
                <p className="text-green-600 text-sm mt-1">Click to open</p>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTree(tree.id);
                }}
                className="absolute top-4 right-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Tree Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          onClick={handleCreateTree}
          className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-2xl p-6 text-green-700 hover:bg-green-50 cursor-pointer transition"
        >
          <Plus className="w-10 h-10 mb-2" />
          <span className="font-medium">Add New Tree</span>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-green-700 text-sm"
      >
        <Link href="/login" className="hover:underline">
          ← Back to Login
        </Link>
        <p className="mt-2">© 2025 D1 Setters — Empowering Academia</p>
      </motion.footer>
    </main>
  );
}
