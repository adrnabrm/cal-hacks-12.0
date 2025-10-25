'use client';
import { motion } from 'framer-motion';
import { Leaf, BookOpen, Network } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center text-center p-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl mb-16"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Leaf className="text-green-600 w-10 h-10" />
          <h1 className="text-4xl font-bold text-green-800">tResearch</h1>
        </div>
        <p className="text-lg text-green-700 max-w-2xl mx-auto">
          A smarter, more efficient way to discover and visualize academic knowledge. Build your paper from a forest of connected research.
        </p>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="grid md:grid-cols-3 gap-8 max-w-6xl"
      >
        {[
          {
            icon: <BookOpen className="text-green-700 w-12 h-12 mb-4" />,
            title: 'Explore Research',
            text: 'Search across a wide range of academic databases to find relevant papers for your topic.',
          },
          {
            icon: <Network className="text-green-700 w-12 h-12 mb-4" />,
            title: 'Visualize Connections',
            text: 'See how different studies connect and influence each other in a dynamic, tree-like graph.',
          },
          {
            icon: <Leaf className="text-green-700 w-12 h-12 mb-4" />,
            title: 'Grow Your Paper',
            text: 'Generate a solid literature foundation for your next publication with ease and clarity.',
          },
        ].map(({icon, title, text}) => {
          const content = (
            <div
              className="bg-white border border-green-100 shadow-md rounded-2xl p-6 flex flex-col items-center hover:shadow-lg transition-shadow hover:scale-[1.02] duration-200"
            >
              {icon}
              <h2 className="text-xl font-semibold text-green-800 mb-2">{title}</h2>
              <p className="text-green-600 text-sm">{text}</p>
            </div>
          );
          
          return content;
        })}
        
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        className="mt-16"
      >
        <Link href="/visualize">
        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full text-lg shadow-md transition-transform hover:scale-105">
          Get Started
        </button>
        </Link>

      </motion.div>

      <footer className="mt-20 text-green-700 text-sm">
        © 2025 D1 Setters — Empowering Academia
      </footer>
    </main>
  );
}
