// src/pages/LandingPage.jsx

import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronRight, Wind, Leaf, BarChart3, Bot } from 'lucide-react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

// --- VISUAL COMPONENTS ---
const GlassCard = ({ children }) => ( <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6 w-full h-full"> {children} </div> );
const AIPowerVisual = () => ( <GlassCard> <div className="flex flex-col items-center justify-center h-full text-center"> <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { delay: 0.2, type: 'spring' } }}> <Bot size={64} className="text-purple-400" /> </motion.div> <h3 className="text-2xl font-bold mt-4">AI Analysis Core</h3> <p className="text-slate-400 mt-2">Processing thousands of data points.</p> <div className="w-full h-2 bg-slate-700 rounded-full mt-6 overflow-hidden"> <motion.div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" initial={{width: '0%'}} animate={{width: '100%'}} transition={{duration: 2, delay: 0.5}}></motion.div> </div> </div> </GlassCard> );
const GasAnalysisVisual = () => ( <GlassCard> <h3 className="font-bold text-slate-300 mb-4">Gas Emission Breakdown</h3> <div className="space-y-4"> <div className="flex items-center gap-4"> <span className="font-mono text-sm text-blue-400">CO₂</span> <div className="w-full h-4 bg-slate-700 rounded-full"><div className="h-4 bg-blue-500 rounded-full w-[75%]"></div></div> <span className="text-sm font-semibold">75.2%</span> </div> <div className="flex items-center gap-4"> <span className="font-mono text-sm text-purple-400">CH₄</span> <div className="w-full h-4 bg-slate-700 rounded-full"><div className="h-4 bg-purple-500 rounded-full w-[15%]"></div></div> <span className="text-sm font-semibold">15.5%</span> </div> <div className="flex items-center gap-4"> <span className="font-mono text-sm text-green-400">PM10</span> <div className="w-full h-4 bg-slate-700 rounded-full"><div className="h-4 bg-green-500 rounded-full w-[6%]"></div></div> <span className="text-sm font-semibold">5.8%</span> </div> </div> </GlassCard> );
const SequestrationVisual = () => ( <GlassCard> <h3 className="font-bold text-slate-300 mb-4">Carbon Sequestration</h3> <div className="flex items-end justify-between h-4/5"> {[30, 50, 40, 70, 60, 85].map((h, i) => ( <motion.div key={i} className="w-8 bg-green-500 rounded-t-md" initial={{ height: 0 }} animate={{ height: `${h}%`}} transition={{ duration: 0.5, delay: i * 0.1 }} /> ))} </div> </GlassCard> );
const TargetsVisual = () => ( <GlassCard> <h3 className="font-bold text-slate-300 mb-4">Reduction Target Progress</h3> <div className="flex items-center justify-center h-full"> <div className="relative w-40 h-40"> <svg className="w-full h-full transform -rotate-90"><circle cx="80" cy="80" r="70" stroke="#334155" strokeWidth="15" fill="none"/><motion.circle cx="80" cy="80" r="70" stroke="#3b82f6" strokeWidth="15" fill="none" strokeLinecap="round" strokeDasharray="440" initial={{strokeDashoffset: 440}} animate={{strokeDashoffset: 440 - (440 * 0.65)}} transition={{duration: 1.5, delay: 0.3}} /></svg> <div className="absolute inset-0 flex flex-col items-center justify-center"> <span className="text-4xl font-bold">65%</span> <span className="text-sm text-slate-400">of target</span> </div> </div> </div> </GlassCard> );
const featureData = [
  { id: 'ai_power', icon: Bot, title: 'Powered by AI', description: 'Our platform leverages advanced machine learning to analyze emission patterns, predict future trends, and suggest optimal reduction strategies automatically.', visual: <AIPowerVisual />, },
  { id: 'gas_analysis', icon: Wind, title: 'Individual Gas Analysis', description: 'Go beyond total emissions. Get a granular breakdown of CO₂, CH₄, and particulate matter to target the most critical sources with precision.', visual: <GasAnalysisVisual />, },
  { id: 'sequestration', icon: Leaf, title: 'Track Carbon Sequestration', description: 'Monitor the positive impact of your offsetting initiatives. Our dashboard visualizes carbon sequestration efforts in real-time, turning goals into measurable results.', visual: <SequestrationVisual />, },
  { id: 'targets', icon: BarChart3, title: 'Set & Meet Reduction Targets', description: 'Define your emission reduction goals and track your progress. The platform provides clear, actionable data to ensure you stay on target for a sustainable future.', visual: <TargetsVisual />, },
];

// --- MAIN LANDING PAGE COMPONENT ---
const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(featureData[0].id);
  const particlesInit = useCallback(async engine => { await loadSlim(engine); }, []);
  const particlesOptions = { background: { color: { value: '#0f172a' } }, fpsLimit: 60, interactivity: { events: { onHover: { enable: true, mode: 'repulse' }, resize: true }, modes: { repulse: { distance: 100, duration: 0.4 } } }, particles: { color: { value: ['#3b82f6', '#8b5cf6'] }, links: { color: '#475569', distance: 150, enable: true, opacity: 0.2, width: 1 }, move: { direction: 'none', enable: true, outModes: { default: 'bounce' }, random: true, speed: 1, straight: false }, number: { density: { enable: true, area: 800 }, value: 80 }, opacity: { value: {min: 0.1, max: 0.5}, animation: { enable: true, speed: 1, sync: false } }, shape: { type: 'circle' }, size: { value: { min: 1, max: 5 } } }, detectRetina: true };

  return (
    <div className="relative min-h-screen w-full bg-slate-900 text-white font-sans">
      <Particles id="tsparticles" init={particlesInit} options={particlesOptions} className="absolute inset-0 z-0" />
      <div className="relative z-10">
        <div className="h-screen flex flex-col items-center justify-center text-center p-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">Intelligent Emission Solutions</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">Transforming industrial monitoring with AI-driven precision and clarity. Scroll down to explore.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }} className="absolute bottom-10 animate-bounce"><div className="w-8 h-8 border-2 border-slate-500 rounded-full flex items-center justify-center"><div className="w-1 h-3 bg-slate-500 rounded-full"></div></div></motion.div>
        </div>
        <div className="relative flex w-full max-w-7xl mx-auto items-start gap-8 px-8 py-24">
          <div className="w-1/2 sticky top-24 h-[60vh] hidden lg:block">
            <AnimatePresence mode="wait">
              {featureData.map(feature => activeFeature === feature.id && ( <motion.div key={feature.id} initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -50 }} transition={{ duration: 0.5, ease: 'easeInOut' }} className="absolute inset-0">{feature.visual}</motion.div> ))}
            </AnimatePresence>
          </div>
          <div className="w-full lg:w-1/2 space-y-48">
            {/* MODIFIED: Pass the index to the FeatureSection component */}
            {featureData.map((feature, index) => ( <FeatureSection key={feature.id} index={index} id={feature.id} icon={feature.icon} title={feature.title} description={feature.description} setActiveFeature={setActiveFeature} /> ))}
            <div className="h-screen flex flex-col items-center justify-center text-center">
                <h2 className="text-4xl font-bold mb-4">Ready to Take Control?</h2>
                <p className="text-slate-400 mb-8 max-w-lg">Explore the full platform and see how our real-time data can revolutionize your operations.</p>
                <Link to="/dashboard"><button className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transform hover:scale-105">View Live Dashboard<ChevronRight className="w-6 h-6 ml-2 transition-transform duration-300 group-hover:translate-x-1" /></button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT FOR SCROLLING TEXT SECTIONS (NOW ANIMATED) ---
const FeatureSection = ({ id, index, icon: Icon, title, description, setActiveFeature }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });

  if (isInView) { setActiveFeature(id); }

  // Define animation variants for left and right
  const slideInFromLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };
  const slideInFromRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };
  
  // Alternate animation based on index
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="py-8">
      <motion.div
        // Choose variant based on index
        variants={isEven ? slideInFromLeft : slideInFromRight}
        initial="hidden"
        // Animate when in view
        animate={isInView ? "visible" : "hidden"}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700">
              <Icon className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-slate-400">{description}</p>
      </motion.div>
    </div>
  );
};

export default LandingPage;