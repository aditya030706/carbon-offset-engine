// src/pages/GasDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Droplet, Settings, Bell, Factory, Leaf, Map, Zap, TreePine, BarChartHorizontal } from 'lucide-react';
import { motion } from "framer-motion";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

import Loader from '../components/Loader';
import AnimatedNumber from '../components/AnimatedNumber';

// --- DATA ---
// Separated PM10 and PM2.5 data again
const trendData = {
    co2: [ { month: 'Jan', value: 38.5 }, { month: 'Feb', value: 35.0 }, { month: 'Mar', value: 39.8 }, { month: 'Apr', value: 36.2 }, { month: 'May', value: 41.7 }, { month: 'Jun', value: 40.5 }, { month: 'Jul', value: 42.2 }, { month: 'Aug', value: 43.1 }, { month: 'Sep', value: 40.9 }, { month: 'Oct', value: 38.8 }, { month: 'Nov', value: 41.5 }, { month: 'Dec', value: 44.0 } ],
    ch4: [ { month: 'Jan', value: 12.1 }, { month: 'Feb', value: 11.5 }, { month: 'Mar', value: 13.2 }, { month: 'Apr', value: 12.8 }, { month: 'May', value: 14.5 }, { month: 'Jun', value: 13.9 }, { month: 'Jul', value: 15.1 }, { month: 'Aug', value: 15.5 }, { month: 'Sep', value: 14.8 }, { month: 'Oct', value: 13.9 }, { month: 'Nov', value: 14.9 }, { month: 'Dec', value: 16.0 } ],
    pm10: [ { month: 'Jan', value: 5.2 }, { month: 'Feb', value: 4.8 }, { month: 'Mar', value: 5.9 }, { month: 'Apr', value: 5.5 }, { month: 'May', value: 6.3 }, { month: 'Jun', value: 6.0 }, { month: 'Jul', value: 6.5 }, { month: 'Aug', value: 6.8 }, { month: 'Sep', value: 6.2 }, { month: 'Oct', value: 5.8 }, { month: 'Nov', value: 6.1 }, { month: 'Dec', value: 7.0 } ],
    pm25: [ { month: 'Jan', value: 2.8 }, { month: 'Feb', value: 2.5 }, { month: 'Mar', value: 3.1 }, { month: 'Apr', value: 2.9 }, { month: 'May', value: 3.4 }, { month: 'Jun', value: 3.2 }, { month: 'Jul', value: 3.6 }, { month: 'Aug', value: 3.8 }, { month: 'Sep', value: 3.4 }, { month: 'Oct', value: 3.1 }, { month: 'Nov', value: 3.3 }, { month: 'Dec', value: 4.0 } ],
};

// --- NEW: Combine PM data into a single array for the chart ---
const particulateMatterData = trendData.co2.map((item, index) => ({
    month: item.month,
    PM10: trendData.pm10[index].value,
    'PM2.5': trendData.pm25[index].value,
}));


const calculateAverage = (dataArray) => { const sum = dataArray.reduce((acc, item) => acc + item.value, 0); return parseFloat((sum / dataArray.length).toFixed(1)); };
const co2Average = calculateAverage(trendData.co2);
const ch4Average = calculateAverage(trendData.ch4);
const pieData = [ { name: 'CO₂ Avg', value: co2Average }, { name: 'CH₄ Avg', value: ch4Average }, ];
const COLORS = ['#3b82f6', '#8b5cf6'];
const forecastData = [ { year: '2022', value: 44.0 }, { year: '2023', value: 45.1 }, { year: '2024', value: 46.2 }, { year: '2025', value: 47.3, forecast: 47.3 }, { year: '2026', forecast: 48.9 }, { year: '2027', forecast: 50.5 }, { year: '2028', forecast: 52.1 }, { year: '2029', forecast: 53.7 }, { year: '2030', forecast: 55.3 } ];
const mitigationData = [ { name: 'Afforestation', effectiveness: 85, icon: TreePine, color: 'text-green-400' }, { name: 'Methane Capture', effectiveness: 70, icon: Zap, color: 'text-purple-400' }, { name: 'Land Reclamation', effectiveness: 55, icon: Factory, color: 'text-blue-400' } ];
const hotspotData = { 'Jharkhand': { emissions: 95, color: 'fill-red-500/80' }, 'Odisha': { emissions: 88, color: 'fill-red-500/60' }, 'Chhattisgarh': { emissions: 85, color: 'fill-orange-500/80' }, 'West Bengal': { emissions: 75, color: 'fill-orange-500/60' }, 'Madhya Pradesh': { emissions: 70, color: 'fill-amber-500/80' } };

// --- REUSABLE COMPONENTS ---
const GlassCard = ({ children, className }) => ( <motion.div className={`bg-slate-500/10 backdrop-blur-xl border border-slate-400/20 rounded-2xl shadow-lg ${className}`} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }} variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } }}> {children} </motion.div> );
const Header = () => ( <motion.header className="sticky top-0 z-50 flex items-center justify-between p-4 mb-8 bg-slate-900/50 backdrop-blur-lg border-b border-slate-700/50" initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}> <div className="flex items-center gap-4"> <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"><Droplet size={24} /></div> <h1 className="text-xl font-bold">India's Avg Emission Dashboard</h1> </div> <div className="flex items-center gap-4"> <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"><Bell size={20} /></button> <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"><Settings size={20} /></button> </div> </motion.header> );
const TrendChart = ({ data, strokeColor, gradientColor, title, icon: Icon }) => ( <GlassCard className="p-6"> <motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="flex items-center gap-2 text-lg font-semibold text-slate-300 mb-4">{Icon && <Icon size={20} />} {title} Trend (MtCO₂e)</motion.h3> <ResponsiveContainer width="100%" height={250}> <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}> <defs><linearGradient id={`color_${gradientColor}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/><stop offset="95%" stopColor={strokeColor} stopOpacity={0}/></linearGradient></defs> <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}/> <XAxis dataKey="month" stroke="#64748b" interval={1} /><YAxis stroke="#64748b" /> <Area type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={3} fill={`url(#color_${gradientColor})`} /> </AreaChart> </ResponsiveContainer> </GlassCard> );
const AnimatedCustomLabel = ({ cx, cy, midAngle, outerRadius, value, name, fill }) => { const RADIAN = Math.PI / 180; const radius = outerRadius + 30; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); const sin = Math.sin(-midAngle * RADIAN); const cos = Math.cos(-midAngle * RADIAN); const sx = cx + (outerRadius + 5) * cos; const sy = cy + (outerRadius + 5) * sin; const mx = cx + (outerRadius + 20) * cos; const my = cy + (outerRadius + 20) * sin; const ex = mx + (cos >= 0 ? 1 : -1) * 22; const ey = my; const textAnchor = cos >= 0 ? 'start' : 'end'; return ( <g> <motion.path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} fill="none" stroke={fill} strokeWidth={2} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}/> <motion.text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={5} textAnchor={textAnchor} fill="#e2e8f0" className="text-sm font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.0 }}>{`${name} (${value})`}</motion.text> </g> ); };

// --- MAIN DASHBOARD COMPONENT ---
const GasDashboard = () => {
    const [loading, setLoading] = useState(true);
    useEffect(() => { setTimeout(() => setLoading(false), 1200); }, []);
    const particlesInit = useCallback(async engine => { await loadSlim(engine); }, []);
    const particlesOptions = { background: { color: { value: 'transparent' } }, fpsLimit: 60, interactivity: { events: { onHover: { enable: true, mode: 'repulse' }, resize: true }, modes: { repulse: { distance: 80, duration: 0.4 } } }, particles: { color: { value: ["#3b82f6", "#a855f7", "#2dd4bf"] }, links: { color: '#475569', distance: 150, enable: true, opacity: 0.1, width: 1 }, move: { direction: 'none', enable: true, outModes: { default: 'bounce' }, random: true, speed: 0.5, straight: false }, number: { density: { enable: true, area: 800 }, value: 50 }, opacity: { value: {min: 0.1, max: 0.4} }, shape: { type: 'circle' }, size: { value: { min: 1, max: 4 } } }, detectRetina: true, };

    if (loading) return <Loader />;

    return (
        <div className="relative min-h-screen w-full font-sans text-white bg-slate-900">
            <Particles id="tsparticles-dashboard" init={particlesInit} options={particlesOptions} className="absolute inset-0 z-0" />
            <div className="relative z-10">
                <Header />
                <motion.main className="px-8 pb-8" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Left Column */}
                        <div className="lg:col-span-1 flex flex-col gap-8">
                            <GlassCard className="p-6 text-center h-[450px]">
                                <motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="text-lg font-semibold text-slate-300 mb-4">CO₂ vs. CH₄ Avg. Emissions</motion.h3>
                                <ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}><Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={<AnimatedCustomLabel />} innerRadius={80} outerRadius={100} dataKey="value" paddingAngle={5}>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}</Pie></PieChart></ResponsiveContainer>
                            </GlassCard>
                            <GlassCard className="p-6">
                                <motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }}><motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="text-lg font-semibold text-slate-300 mb-6">Reduction Targets</motion.h3><motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }} className="space-y-6"><motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="flex items-center gap-4"><Factory className="w-8 h-8 text-purple-400 flex-shrink-0" /><div><div className="text-sm text-slate-400">CO₂ Reduction</div><div className="text-xl font-bold">32%</div></div></motion.div><motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="flex items-center gap-4"><Leaf className="w-8 h-8 text-green-400 flex-shrink-0" /><div><div className="text-sm text-slate-400">Total Offset</div><div className="text-xl font-bold"><AnimatedNumber value={20} /> MtCO₂</div></div></motion.div></motion.div></motion.div>
                            </GlassCard>
                        </div>
                        
                        {/* Right Column */}
                        <motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }} className="lg:col-span-2 grid grid-cols-1 gap-8">
                            <TrendChart data={trendData.co2} strokeColor="#3b82f6" gradientColor="blue" title="CO₂" icon={Factory} />
                            <TrendChart data={trendData.ch4} strokeColor="#8b5cf6" gradientColor="purple" title="CH₄" icon={Zap} />
                            
                            {/* --- MODIFIED Particulate Matter Chart --- */}
                            <GlassCard className="p-6">
                                <motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="flex items-center gap-2 text-lg font-semibold text-slate-300 mb-4">
                                    <BarChartHorizontal size={20} /> Particulate Matter Trend (MtCO₂e)
                                </motion.h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={particulateMatterData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="color_pm10" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                            <linearGradient id="color_pm25" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}/>
                                        <XAxis dataKey="month" stroke="#64748b" interval={1} />
                                        <YAxis stroke="#64748b" />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area type="monotone" dataKey="PM10" name="PM10" stroke="#10b981" strokeWidth={3} fill="url(#color_pm10)" />
                                        <Area type="monotone" dataKey="PM2.5" name="PM2.5" stroke="#f59e0b" strokeWidth={3} fill="url(#color_pm25)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </GlassCard>
                        </motion.div>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <GlassCard className="lg:col-span-2 p-6"> <motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2"><Map size={20}/> Emission Hotspots</motion.h3> <div className="grid grid-cols-2 gap-6"> <div className="aspect-square flex items-center justify-center"> <svg viewBox="0 0 160 180" className="w-full h-full"> <path d="M110.3,55.7c-0.1,0-0.2-0.1-0.2-0.1c-0.8-0.4-1.2-1.3-0.8-2.1l5.5-11.4c0.4-0.8,1.3-1.2,2.1-0.8l11.4,5.5 c0.8,0.4,1.2,1.3,0.8,2.1l-5.5,11.4c-0.3,0.7-1,1.1-1.7,1.1C111,61.4,110.6,61.1,110.3,55.7z" className="fill-slate-700/50 stroke-slate-600"/> <path d="M109.9,1.1l-2.3,1.6L129,20.4l-5.3-6.6c-0.4-0.5-1-0.7-1.6-0.7l-11.7,0.3c-0.8,0-1.5-0.5-1.7-1.3L101.8,4 C101.5,3,100.5,2.4,99.5,2.7L95,3.9L85.7,0.8c-0.7-0.2-1.4,0.1-1.8,0.7L81.2,6l-3.2-3.2c-0.5-0.5-1.4-0.5-1.9,0L62,16.9l-2.7-2.7 c-0.5-0.5-1.4-0.5-1.9,0l-6.8,6.8l-4.5-0.4c-0.8,0-1.5,0.5-1.7,1.3L44.1,23c-0.2,0.8,0.2,1.6,1,1.9l4.5,1.7l-3,3.4l-3.6,0.2 c-0.8,0-1.5,0.6-1.7,1.4l-1.3,5.9c-0.2,0.8,0.3,1.6,1.1,1.8l2.9,0.7L31.9,49l-2.5-2.2c-0.6-0.5-1.5-0.5-2.1,0.1l-8.2,7.7 L16.4,54l-3,1.5c-0.7,0.4-1.2,1.1-1.2,1.9v2.7l-4.5,0.2c-0.8,0-1.5,0.6-1.7,1.4L4.8,67.7c-0.2,0.8,0.3,1.6,1.1,1.8l2.9,0.7 l-0.9,4.7L3.4,73.1c-0.8-0.3-1.6,0.1-1.9,0.9L0,82.4c-0.3,0.8,0.1,1.6,0.9,1.9l3.4,1.5l-0.2,3.2c0,0.8,0.5,1.5,1.3,1.7 l5.2,1.3l-2.5,4.7l-2.1,0.5c-0.8,0.2-1.4,0.9-1.4,1.7l0.2,5.2l-3,6.2c-0.4,0.7-0.4,1.6,0.1,2.2l4.1,5.2l-0.9,3.6 c-0.2,0.8,0.2,1.6,1,1.9l4.3,1.5l-1.8,4.7l-2.5,0.7c-0.8,0.2-1.4,0.9-1.4,1.7l0.2,5.2c0,0.8,0.6,1.5,1.4,1.7l4.1,0.9l-1.6,5.5 l-2.5,1.3c-0.8,0.4-1.2,1.3-0.8,2.1l1.8,3.2c0.4,0.8,1.3,1.2,2.1,0.8l2.5-1.3l1.8,3.2c0.4,0.8,1.3,1.2,2.1,0.8l2.5-1.3l1.8,4.7 c0.3,0.8,1.2,1.3,2,1l2.5-0.9l2.1,5.5l-0.9,3.4c-0.2,0.8,0.2,1.6,1,1.9l4.3,1.5c0.8,0.3,1.6-0.1,1.9-0.9l0.9-3.4l2.1,1.8 c0.6,0.5,1.5,0.5,2.1,0.1l2.5-2.2l1.6,3.4c0.3,0.7,1.1,1.2,1.9,1l2.5-0.7l2.1,2.1c0.5,0.5,1.4,0.5,1.9,0l1.8-1.8l2.1,2.7 c0.5,0.6,1.3,0.8,2,0.5l2.5-0.9l3.8,2.7c0.7,0.5,1.6,0.4,2.2-0.2l1.8-1.8l2.1,2.7c0.5,0.6,1.3,0.8,2,0.5l2.5-0.9l2.1,2.7 c0.5,0.6,1.3,0.8,2,0.5l2.5-0.9l3.8,5.5c0.5,0.7,1.4,0.9,2.2,0.5l2.5-1.3l3.8,3.6c0.6,0.6,1.6,0.6,2.2,0l2.5-2.5l3.8,4.7 c0.5,0.7,1.4,0.9,2.2,0.5l2.5-1.3l3.8,2.7c0.7,0.5,1.6,0.4,2.2-0.2l2.5-2.5l3.8,1.8c0.7,0.3,1.6,0.1,2-0.7l1.3-2.5l3.8,2.7 c0.7,0.5,1.6,0.4,2.2-0.2l2.5-2.5l3.8,1.8c0.7,0.3,1.6,0.1,2-0.7l1.3-2.5l3.8-0.9c0.8-0.2,1.4-0.9,1.4-1.7V93.8 c0-0.8-0.5-1.5-1.3-1.7l-3.8-0.9l1.3-2.5c0.4-0.8,0.2-1.7-0.5-2.2l-3.8-2.7l1.3-2.5c0.4-0.8,0.2-1.7-0.5-2.2l-3.8-2.7l1.3-2.5 c0.4-0.8,0.2-1.7-0.5-2.2l-3.8-2.7l1.3-3.8c0.3-0.8-0.1-1.6-0.9-1.9L135,59.3l-0.9-3.8c-0.2-0.8-0.9-1.4-1.7-1.4l-5.2-0.2 c-0.8,0-1.5-0.5-1.7-1.3l-1.3-5.2c-0.2-0.8-0.9-1.4-1.7-1.4l-5.2-0.2c-0.8,0-1.5-0.5-1.7-1.3L114,39c-0.2-0.8-0.9-1.4-1.7-1.4 l-5.2-0.2c-0.8,0-1.5-0.5-1.7-1.3l-1.3-5.2C104,30.1,104.5,29.3,105.3,29.1z" className="fill-slate-700/50 stroke-slate-600"/> {Object.entries(hotspotData).map(([state, data]) => ( <motion.path key={state} d="M85,55 a 5 5 0 1 1 -10 0 a 5 5 0 1 1 10 0" transform={`translate(${Math.random()*40-20}, ${Math.random()*40-20})`} className={data.color} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: Math.random() * 0.5, duration: 0.5 }}/> ))} </svg> </div> <div className="flex flex-col justify-center space-y-3"> {Object.entries(hotspotData).map(([state, data]) => ( <motion.div key={state} className="flex items-center gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + Math.random() * 0.5 }}> <div className={`w-3 h-3 rounded-full ${data.color.replace('fill-', 'bg-')}`}></div> <div> <span className="font-bold">{state}</span> <span className="text-sm text-slate-400"> - {data.emissions} MtCO₂e</span> </div> </motion.div> ))} </div> </div> </GlassCard>
                         <GlassCard className="lg:col-span-1 p-6"> <motion.h3 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }} className="text-lg font-semibold text-slate-300 mb-4">Emission Forecast (vs. 2030 Target)</motion.h3> <ResponsiveContainer width="100%" height={250}> <AreaChart data={forecastData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} /> <XAxis dataKey="year" stroke="#64748b" /> <YAxis stroke="#64748b" /> <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} fill="url(#color_blue)" /> <Area type="monotone" dataKey="forecast" stroke="#f472b6" strokeWidth={3} strokeDasharray="5 5" fill="none" /> </AreaChart> </ResponsiveContainer> </GlassCard>
                    </div>
                </motion.main>
            </div>
        </div>
    );
};

export default GasDashboard;