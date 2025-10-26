'use client';
import { motion } from 'framer-motion';
import { Leaf, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ✅ Handle Login / Signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        alert('Signup successful!');
      } else {
        // Login flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/library');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full py-2 mt-4 shadow-md transition-transform hover:scale-105 flex items-center justify-center gap-2"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />{' '}
                {loading ? 'Creating...' : 'Create Account'}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" /> {loading ? 'Logging in...' : 'Log In'}
              </>
            )}
          </button>
        </form>

        {/* Error message */}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

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
