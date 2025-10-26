'use client';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Leaf, ArrowLeft, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function GraphPage() {
  const { id } = useParams();
  const router = useRouter();
  const [treeName, setTreeName] = useState('');

  // Simulate loading the tree info (you can replace this with real fetch later)
  useEffect(() => {
    if (id) {
      setTreeName(decodeURIComponent(id.toString()).replace(/-/g, ' '));
    }
  }, [id]);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this tree?')) {
      // Later, handle backend deletion here
      alert(`Deleted ${treeName || 'Tree'}`);
      router.push('/library');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-6xl mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/library')}
            className="flex items-center text-green-700 hover:text-green-900 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Library
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Leaf className="text-green-600 w-7 h-7" />
          <h1 className="text-2xl font-bold text-green-800">{treeName || 'Research Tree'}</h1>
        </div>

        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 transition flex items-center gap-1"
        >
          <Trash2 className="w-5 h-5" />
          Delete Tree
        </button>
      </motion.header>

      {/* Visualization Container */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="w-full max-w-6xl flex-1 bg-white border border-green-100 rounded-2xl shadow-md p-6 relative"
      >
        {/* Placeholder for your D3 / Graph Component */}
        <div className="flex flex-col items-center justify-center h-full text-green-700">
          <Leaf className="w-12 h-12 mb-4 opacity-70" />
          <p className="text-lg">Your tree visualization will grow here 🌱</p>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="mt-10 text-green-700 text-sm">
        © 2025 D1 Setters — Empowering Academia
      </footer>
    </main>
  );
}
