import React from 'react';

interface LoaderProps {
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message = 'Loading campus events...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping"></div>
        <div className="w-16 h-16 rounded-full border-4 border-t-pink-500 border-r-purple-500 border-b-cyan-400 border-l-amber-400 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-xl">
          ✨
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-300 tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};
