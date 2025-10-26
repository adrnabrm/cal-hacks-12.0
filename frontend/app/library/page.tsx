'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Plus, Trash2, BookOpen, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Tree {
  id: string;
  title: string;
  created_at: string;
}

export default function LibraryPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 🔐 Check auth and load trees
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      await fetchTrees();
    })();
  }, [router]);

  // 📥 Fetch user's trees (RLS ensures security)
  const fetchTrees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trees')
      .select('id, title, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trees:', error.message);
    } else {
      setTrees(data || []);
    }

    setLoading(false);
  };

  // ➕ Create new tree
  const handleCreateTree = async () => {
    const title = prompt('Enter a title for your new research tree:');
    if (!title) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Session expired. Please log in again.');
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('trees')
      .insert({ title, user_id: user.id }) // ✅ includes user_id to satisfy RLS
      .select()
      .single();

    if (error) {
      console.error('Error creating tree:', error.message);
      alert('Error creating tree: ' + error.message);
      return;
    }

    router.push(`/visualize?treeId=${data.id}`);
  };

  // 🗑 Delete tree
  const handleDeleteTree = async (id: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this tree?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('trees').delete().eq('id', id);
    if (error) {
      console.error('Error deleting tree:', error.message);
      alert('Failed to delete tree.');
    } else {
      setTrees((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // 📂 Open tree
  const handleOpenTree = (id: string) => {
    router.push(`/visualize?treeId=${id}`);
  };

  // 🚪 Log out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-green-50">
        <p className="text-green-800 text-lg">Loading your library...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mb-10 text-center"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Leaf className="text-green-600 w-10 h-10" />
            <h1 className="text-3xl font-bold text-green-800">Your Research Library</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
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
                <h2 className="text-lg font-semibold text-green-800">{tree.title}</h2>
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
