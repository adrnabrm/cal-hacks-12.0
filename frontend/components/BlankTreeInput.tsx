'use client';
import { FormEvent } from 'react';

interface Props {
  visible: boolean;
  onSubmit: (title: string) => void;
}

export default function BlankTreeInput({ visible, onSubmit }: Props) {
  if (!visible) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('paperTitle') as HTMLInputElement;
    const title = input.value.trim();
    if (!title) return;
    onSubmit(title);
    form.reset();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-[80] text-center">
      <p className="text-lg text-green-800 mb-3">
        🌱 This tree is empty. Add your first research paper below.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
        <input
          type="text"
          name="paperTitle"
          placeholder="Enter paper title..."
          className="border border-green-300 rounded-lg px-3 py-2 w-80 focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Add Paper
        </button>
      </form>
    </div>
  );
<<<<<<< HEAD
}

=======
}
>>>>>>> angelobranch2
