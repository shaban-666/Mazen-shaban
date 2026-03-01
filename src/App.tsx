/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  ArrowRight,
  Search,
  Layout,
  FileCheck,
  ChevronRight,
  Sparkles,
  FileUp,
  X,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { analyzeResume, optimizeResume, type ATSAnalysis } from './services/gemini';
import { cn } from './utils/cn';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function App() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'analysis' | 'optimization'>('input');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const resumeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setFileName(file.name);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await parsePDF(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        text = await parseDocx(file);
      } else {
        alert('Unsupported file format. Please upload PDF or Word (.docx).');
        setFileName(null);
        return;
      }
      setResumeText(text);
    } catch (error) {
      console.error('File parsing failed:', error);
      alert('Failed to parse file. Please try again or paste text manually.');
      setFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeResume(resumeText, jobDescription);
      setAnalysis(result);
      setStep('analysis');
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (!resumeText || !analysis) return;
    setIsOptimizing(true);
    try {
      const result = await optimizeResume(resumeText, analysis);
      setOptimizedResume(result.content);
      setStep('optimization');
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to optimize resume. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    
    const element = resumeRef.current;
    
    // Temporarily adjust styles for high-quality capture
    const originalStyle = element.style.cssText;
    element.style.width = '210mm'; // A4 width
    element.style.padding = '25mm';
    element.style.backgroundColor = 'white';
    element.style.height = 'auto';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; 
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('optimized-resume.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  const reset = () => {
    setResumeText('');
    setJobDescription('');
    setAnalysis(null);
    setOptimizedResume(null);
    setStep('input');
    setFileName(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <FileCheck size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">ATS Optimizer</span>
          </div>
          
          <div className="flex items-center gap-4">
            {step !== 'input' && (
              <button 
                onClick={reset}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Start Over
              </button>
            )}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">v1.0 Professional</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-gray-900">
                  Your Resume, <span className="text-indigo-600">Perfected</span>.
                </h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                  Upload your resume in PDF or Word format. Our AI will analyze it against ATS standards and rewrite it for maximum impact.
                </p>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-8 sm:p-10 space-y-8">
                {/* File Upload Area */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileUp size={18} className="text-indigo-600" />
                    Upload Resume (PDF or Word)
                  </label>
                  
                  {!fileName ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group cursor-pointer relative border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".pdf,.docx" 
                        className="hidden" 
                      />
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <Upload size={32} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-500 mt-1">PDF or DOCX (Max 10MB)</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{fileName}</p>
                          <p className="text-xs text-indigo-600 font-medium">
                            {isParsing ? 'Parsing content...' : 'File ready for analysis'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setFileName(null); setResumeText(''); }}
                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Search size={18} className="text-indigo-600" />
                    Target Job Description (Optional)
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description to tailor your resume for specific keywords..."
                    className="w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none text-sm bg-gray-50/50"
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!resumeText.trim() || isAnalyzing || isParsing}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg text-white transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200",
                    isAnalyzing || isParsing ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] hover:-translate-y-0.5"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      AI is Analyzing...
                    </>
                  ) : isParsing ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      Reading File...
                    </>
                  ) : (
                    <>
                      Start Free Analysis
                      <ArrowRight size={24} />
                    </>
                  )}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 font-bold text-gray-400"><Layout size={20} /> ATS-Friendly</div>
                <div className="flex items-center gap-2 font-bold text-gray-400"><CheckCircle2 size={20} /> 99% Accuracy</div>
                <div className="flex items-center gap-2 font-bold text-gray-400"><Sparkles size={20} /> AI-Powered</div>
              </div>
            </motion.div>
          )}

          {step === 'analysis' && analysis && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left: Score & Summary */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-50 text-center">
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <svg className="w-40 h-40">
                      <circle
                        className="text-gray-50"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                      />
                      <circle
                        className={cn(
                          "transition-all duration-1000 ease-out",
                          analysis.score > 80 ? "text-emerald-500" : analysis.score > 60 ? "text-amber-500" : "text-rose-500"
                        )}
                        strokeWidth="10"
                        strokeDasharray={439.8}
                        strokeDashoffset={439.8 - (439.8 * analysis.score) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                      />
                    </svg>
                    <span className="absolute text-5xl font-black tracking-tighter">{analysis.score}%</span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">ATS Match Score</h2>
                  <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                    {analysis.score > 80 
                      ? 'Excellent! Your resume is ready for top-tier companies.' 
                      : 'Your resume needs optimization to pass modern ATS filters.'}
                  </p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-50 space-y-6">
                  <h3 className="font-black text-gray-900 flex items-center gap-2 uppercase tracking-wider text-xs">
                    <Search size={16} className="text-indigo-600" />
                    Missing Industry Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 hover:-translate-y-1"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      Optimizing Layout...
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} />
                      Optimize & Export
                    </>
                  )}
                </button>
              </div>

              {/* Right: Detailed Analysis */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-50">
                  <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <AlertCircle size={28} className="text-indigo-600" />
                      Detailed Analysis Report
                    </h3>
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest">
                      AI Generated
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Key Strengths</h4>
                      <ul className="space-y-4">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                            <div className="mt-1 w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            </div>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b border-rose-50 pb-2">Critical Weaknesses</h4>
                      <ul className="space-y-4">
                        {analysis.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                            <div className="mt-1 w-5 h-5 bg-rose-50 rounded-full flex items-center justify-center shrink-0">
                              <AlertCircle size={14} className="text-rose-500" />
                            </div>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-gray-50">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6">Formatting & Structure Issues</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.formattingIssues.map((issue, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-600 border border-gray-100 font-medium flex items-center gap-3">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-gray-50">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Strategic Improvements</h4>
                    <div className="prose prose-indigo prose-sm max-w-none text-gray-600 font-medium leading-relaxed">
                      <Markdown>{analysis.suggestedImprovements}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'optimization' && optimizedResume && (
            <motion.div 
              key="optimization"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Professional Layout</h2>
                  <p className="text-gray-500 text-sm font-medium">Your resume has been optimized for both ATS and HR readability.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('analysis')}
                    className="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-white border border-gray-200 rounded-2xl transition-all shadow-sm"
                  >
                    Back to Analysis
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1"
                  >
                    <Download size={20} />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Professional Resume Preview */}
              <div className="bg-gray-100 p-4 sm:p-12 rounded-[2.5rem] shadow-inner overflow-x-auto flex justify-center">
                <div 
                  className="bg-white shadow-2xl p-[25mm] min-h-[297mm] w-[210mm] origin-top relative" 
                  ref={resumeRef}
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    color: '#1a1a1a',
                    lineHeight: '1.5',
                    fontSize: '10.5pt'
                  }}
                >
                  {/* High-End Resume Styling */}
                  <style>{`
                    .resume-content h1 { 
                      font-size: 32pt; 
                      font-weight: 900; 
                      margin-bottom: 8pt; 
                      color: #111827; 
                      text-align: center;
                      letter-spacing: -0.04em;
                      line-height: 1;
                    }
                    .resume-content p:first-of-type { 
                      font-size: 9.5pt; 
                      text-align: center; 
                      color: #6b7280; 
                      margin-bottom: 24pt; 
                      font-weight: 500;
                      letter-spacing: 0.02em;
                    }
                    .resume-content h2 { 
                      font-size: 13pt; 
                      font-weight: 800; 
                      margin-top: 22pt; 
                      margin-bottom: 12pt; 
                      color: #4f46e5; 
                      border-bottom: 1.5pt solid #f3f4f6; 
                      padding-bottom: 6pt; 
                      text-transform: uppercase; 
                      letter-spacing: 0.1em; 
                      display: flex;
                      align-items: center;
                    }
                    .resume-content h2::before {
                      content: '';
                      display: inline-block;
                      width: 4pt;
                      height: 14pt;
                      background-color: #4f46e5;
                      margin-right: 8pt;
                      border-radius: 1pt;
                    }
                    .resume-content h3 { 
                      font-size: 11.5pt; 
                      font-weight: 700; 
                      margin-top: 14pt; 
                      margin-bottom: 4pt; 
                      color: #111827; 
                      display: flex;
                      justify-content: space-between;
                      align-items: baseline;
                    }
                    .resume-content p { 
                      font-size: 10.5pt; 
                      margin-bottom: 8pt; 
                      color: #374151; 
                    }
                    .resume-content ul { 
                      margin-bottom: 12pt; 
                      padding-left: 16pt; 
                      list-style-type: none; 
                    }
                    .resume-content li { 
                      font-size: 10.5pt; 
                      margin-bottom: 5pt; 
                      color: #4b5563; 
                      position: relative;
                    }
                    .resume-content li::before {
                      content: '•';
                      color: #4f46e5;
                      font-weight: bold;
                      display: inline-block;
                      width: 1em;
                      margin-left: -1em;
                      position: absolute;
                    }
                    .resume-content strong { 
                      color: #111827; 
                      font-weight: 600; 
                    }
                    
                    /* Page Break Handling */
                    @media print {
                      .resume-content h2 { page-break-after: avoid; }
                      .resume-content h3 { page-break-after: avoid; }
                    }
                  `}</style>
                  
                  <div className="resume-content prose-none">
                    <Markdown>{optimizedResume}</Markdown>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-400 font-medium">
                  Tip: Use high-quality paper if printing for an in-person interview.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16 mt-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FileCheck size={18} />
            </div>
            <span className="font-black text-xl text-gray-900 tracking-tight">ATS Optimizer</span>
          </div>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            The world's most advanced AI resume optimization tool. Built to help you land your next big role.
          </p>
          <div className="flex justify-center gap-8 text-xs font-black text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
          <div className="pt-8 text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
            © 2026 Professional Career Tools Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}
