/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  PenTool, 
  Lightbulb, 
  Mic, 
  Camera, 
  Download, 
  Volume2, 
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  MousePointer2,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import GeometryCanvas from './components/GeometryCanvas';
import SolutionPanel from './components/SolutionPanel';
import { geminiService } from './services/gemini';
import { Point, Line, AppStatus, CanvasMode } from './types';

export default function App() {
  const [problemText, setProblemText] = useState('');
  const [points, setPoints] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [analysis, setAnalysis] = useState('Hãy vẽ hình hoặc giải bài để AI phân tích cấu trúc không gian.');
  const [solution, setSolution] = useState('');
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);
  const [status, setStatus] = useState<AppStatus>({ message: 'Sẵn sàng', color: 'emerald' });
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [audioData, setAudioData] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('view');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatus = (message: string, color: AppStatus['color'] = 'emerald') => {
    setStatus({ message, color });
  };

  const startLoading = (key: string) => setLoading(prev => ({ ...prev, [key]: true }));
  const stopLoading = (key: string) => setLoading(prev => ({ ...prev, [key]: false }));

  const handleAIDraw = async () => {
    if (!problemText.trim()) return;
    startLoading('draw');
    updateStatus('Đang xây dựng mô hình không gian...', 'teal');

    try {
      const result = await geminiService.analyzeAndDraw(problemText);
      setPoints(result.points);
      setLines(result.lines);
      setAnalysis(result.analysis);
      updateStatus('Đã dựng hình không gian', 'emerald');
    } catch (err) {
      console.error(err);
      updateStatus('Lỗi dựng hình', 'red');
    } finally {
      stopLoading('draw');
    }
  };

  const handleAISolve = async () => {
    if (!problemText.trim()) return;
    startLoading('solve');
    updateStatus('Đang tính toán lời giải...', 'indigo');

    try {
      const result = await geminiService.solveProblem(problemText);
      setSolution(result);
      setIsSolutionOpen(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#14b8a6', '#6366f1', '#a855f7']
      });
      updateStatus('Giải bài hoàn tất!', 'emerald');
      
      // Generate audio for the solution summary
      const summary = "Tôi đã hoàn thành lời giải chi tiết cho bài toán này với 3 phương pháp khác nhau. Bạn có thể xem chi tiết trong bảng lời giải.";
      const audio = await geminiService.generateSpeech(summary);
      setAudioData(audio);
    } catch (err) {
      console.error(err);
      updateStatus('Lỗi giải bài', 'red');
    } finally {
      stopLoading('solve');
    }
  };

  const handleAIHint = async () => {
    if (!problemText.trim()) return;
    startLoading('hint');
    updateStatus('Đang tìm hướng giải...', 'indigo');

    try {
      const result = await geminiService.getHint(problemText);
      setSolution(`### ✨ Gợi ý hướng giải quyết\n\n${result}`);
      setIsSolutionOpen(true);
      updateStatus('Đã có gợi ý', 'emerald');
    } catch (err) {
      console.error(err);
      updateStatus('Lỗi gợi ý', 'red');
    } finally {
      stopLoading('hint');
    }
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startLoading('ocr');
    updateStatus('Đang nhận diện văn bản...', 'teal');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const text = await geminiService.performOCR(base64, file.type);
        setProblemText(text);
        updateStatus('Nhận diện thành công', 'emerald');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      updateStatus('Lỗi OCR', 'red');
    } finally {
      stopLoading('ocr');
    }
  };

  const playAudio = () => {
    if (!audioData) return;
    const byteCharacters = atob(audioData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  const exportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'geo-ai-export.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 glass z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500 rounded-lg shadow-lg shadow-teal-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Geo<span className="text-teal-400">AI</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${status.color}-500 ${status.color === 'emerald' ? 'pulse-emerald' : ''}`}></div>
            {status.message}
          </div>
          <button 
            onClick={exportPNG}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full border border-slate-700 transition-all flex items-center gap-2"
          >
            <Download className="w-3 h-3" />
            Xuất ảnh PNG
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 border-r border-slate-800 flex flex-col glass z-20">
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đề bài toán</label>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading.ocr}
                  className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-1 rounded border border-teal-500/20 hover:bg-teal-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {loading.ocr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  QUÉT ẢNH (OCR)
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleOCR} 
                />
              </div>
              <textarea 
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                className="w-full h-40 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all placeholder:text-slate-600" 
                placeholder="Ví dụ: Cho hình chóp S.ABC có đáy là tam giác đều cạnh a, SA vuông góc (ABC)..."
              />
              {problemText && (
                <div className="mt-2 p-3 bg-slate-900/30 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Xem trước ký hiệu:</div>
                  <div className="text-xs text-slate-300 markdown-body math-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {problemText}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Công cụ</label>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button 
                    onClick={() => setCanvasMode('view')}
                    className={`p-1.5 rounded-md transition-all ${canvasMode === 'view' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Chế độ xem"
                  >
                    <Box className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCanvasMode('lasso')}
                    className={`p-1.5 rounded-md transition-all ${canvasMode === 'lasso' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Công cụ Lasso"
                  >
                    <MousePointer2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCanvasMode('edit')}
                    className={`p-1.5 rounded-md transition-all ${canvasMode === 'edit' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Chế độ chỉnh sửa"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleAIDraw}
                  disabled={loading.draw || !problemText}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 h-12 rounded-xl font-bold text-sm shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-all"
                >
                  {loading.draw ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                  VẼ HÌNH AI
                </button>
                <button 
                  onClick={handleAISolve}
                  disabled={loading.solve || !problemText}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 h-12 rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                >
                  {loading.solve ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                  GIẢI BÀI AI
                </button>
              </div>
              
              <button 
                onClick={handleAIHint}
                disabled={loading.hint || !problemText}
                className="w-full border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading.hint ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                GỢI Ý HƯỚNG GIẢI ✨
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Phân tích hình học ✨</span>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 text-xs text-slate-300 leading-relaxed min-h-[80px] markdown-body math-content">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {analysis}
                </ReactMarkdown>
              </div>

              {canvasMode === 'edit' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                    <Edit3 className="w-3 h-3" />
                    <span>Chế độ chỉnh sửa thủ công</span>
                  </div>
                  <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
                    <li>Kéo các điểm để điều chỉnh vị trí.</li>
                    <li>Nhấn vào cạnh để chuyển đổi Nét liền ↔ Nét đứt.</li>
                  </ul>
                </motion.div>
              )}

              {selectedPointIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-indigo-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã chọn {selectedPointIds.length} điểm</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPointIds([])}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Bỏ chọn
                  </button>
                </motion.div>
              )}

              <button 
                onClick={playAudio}
                disabled={!audioData}
                className="mt-3 w-full py-2.5 rounded-lg border border-teal-500/30 text-teal-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-teal-500/5 transition-all"
              >
                <Volume2 className="w-3 h-3" />
                NGHE GIẢNG BÀI
              </button>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
            GeoAI v1.0 • Powered by Gemini AI
          </div>
        </aside>

        {/* Canvas Area */}
        <section className="flex-1 flex flex-col relative">
          <div 
            className="flex-1 relative"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({
                x: Math.round(e.clientX - rect.left),
                y: Math.round(e.clientY - rect.top)
              });
            }}
          >
            <GeometryCanvas 
              points={points} 
              lines={lines} 
              mode={canvasMode}
              selectedIds={selectedPointIds}
              onSelectionChange={setSelectedPointIds}
              onPointsChange={setPoints}
              onLinesChange={setLines}
            />
            
            {/* Mouse Position Indicator */}
            <div className="absolute bottom-6 left-6 flex gap-4 pointer-events-none">
              <div className="glass px-4 py-2 rounded-full text-[10px] font-mono text-slate-500 pointer-events-auto">
                X: {mousePos.x} Y: {mousePos.y}
              </div>
            </div>

            {/* Empty State Overlay */}
            {points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-4 max-w-md px-8">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                    <PenTool className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-slate-400 font-medium">Chưa có hình vẽ</h3>
                  <p className="text-slate-600 text-xs">Hãy nhập đề bài và nhấn "Vẽ hình AI" để bắt đầu dựng mô hình không gian.</p>
                </div>
              </div>
            )}
          </div>

          {/* Solution Panel */}
          <SolutionPanel 
            isOpen={isSolutionOpen} 
            onClose={() => setIsSolutionOpen(false)} 
            content={solution} 
          />
        </section>
      </main>
    </div>
  );
}
