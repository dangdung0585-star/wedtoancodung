import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { X, Calculator } from 'lucide-react';

interface SolutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

const SolutionPanel: React.FC<SolutionPanelProps> = ({ isOpen, onClose, content }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: '85%' }}
          exit={{ height: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 overflow-hidden flex flex-col"
        >
          <div className="p-6 md:p-8 max-w-4xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-900 py-2 z-10">
              <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Lời giải thông minh (Đa phương thức)
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="markdown-body math-content pb-20">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SolutionPanel;
