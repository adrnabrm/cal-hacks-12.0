'use client';
import { motion } from 'framer-motion';
import { Leaf, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Replace this with your real auth logic later
    // Simulate successful login/signup and redirect
    router.push('/library');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center text-center p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Leaf className="text-green-600 w-10 h-10" />
          <h1 className="text-3xl font-bold text-green-800">tResearch</h1>
        </div>
        <p className="text-green-700 text-sm">
          {isSignUp
            ? 'Create your account to start growing your research tree.'
            : 'Welcome back — log in to continue exploring your research forest.'}
        </p>
      </motion.header>

      {/* Auth Card */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="bg-white border border-green-100 shadow-lg rounded-2xl p-8 w-full max-w-md flex flex-col items-center"
      >
        <h2 className="text-xl font-semibold text-green-800 mb-6">
          {isSignUp ? 'Sign Up' : 'Log In'}
        </h2>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full py-2 mt-4 shadow-md transition-transform hover:scale-105 flex items-center justify-center gap-2"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" /> Create Account
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Log In
              </>
            )}
          </button>
        </form>

        {/* Switch between login/signup */}
        <div className="mt-6 text-sm text-green-700">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsSignUp(false)}
                className="text-green-800 font-semibold hover:underline"
              >
                Log In
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-green-800 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-12 text-green-700 text-sm"
      >
        <Link href="/" className="hover:underline">
          ← Back to Home
        </Link>
        <p className="mt-2">© 2025 D1 Setters — Empowering Academia</p>
      </motion.footer>
    </main>
  );
}
