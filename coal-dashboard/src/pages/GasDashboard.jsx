import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line } from 'recharts';
import { Droplet, Settings, Bell, Factory, Leaf, Zap, TreePine, BarChartHorizontal, MapPin, Map, LocateFixed, AlertCircle, ArrowRight, ArrowLeft, DollarSign, TrendingUp, CheckCircle, Search, Loader2 } from 'lucide-react';
import { motion } from "framer-motion";

// --- Utility Components ---

const Loader = () => <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

const GlassCard = ({ children, className }) => (
  <motion.div 
    className={`bg-slate-500/10 backdrop-blur-xl border border-slate-400/20 rounded-2xl shadow-lg ${className}`} 
    initial="hidden" 
    whileInView="visible" 
    viewport={{once:true,amount:0.3}} 
    transition={{duration:0.6,ease:"easeOut"}} 
    variants={{hidden:{opacity:0,y:50},visible:{opacity:1,y:0}}}
  >
    {children}
  </motion.div>
);

const CsvUploadTool = ({ onUploadSuccess }) => (
    <GlassCard className="p-4 text-center">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">Upload New Emission Data</h3>
        <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 transition-all" onClick={() => { onUploadSuccess(); }}>Select CSV File</button>
    </GlassCard>
);

const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#10b981', '#eab308'];
const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOTSPOT_COLORS = { 'Red': '#ef4444', 'Orange': '#f97316', 'Yellow': '#eab308' };

// --- InteractiveRealMap Component ---

const InteractiveRealMap = ({ onLocationSelect, hotspots = [] }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const hotspotMarkersRef = useRef([]);
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
            document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        script.async = true;
        script.onload = () => { initializeMap(); };
        document.body.appendChild(script);
        return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); } };
    }, []);

    useEffect(() => {
        if (mapInstanceRef.current && hotspots.length > 0) {
            displayHotspots();
        }
    }, [hotspots]);

    const initializeMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const L = window.L;
        const map = L.map(mapRef.current, { center: [21.5, 84.0], zoom: 7, zoomControl: true });
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; OpenStreetMap &copy; CARTO', 
            subdomains: 'abcd', 
            maxZoom: 19 
        }).addTo(map);
        
        const customIcon = L.divIcon({ className: 'custom-marker', html: `<div style="color: #ef4444; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
        
        map.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) { map.removeLayer(markerRef.current); }
            
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            markerRef.current = marker;
            
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                const data = await response.json();
                const locationData = { 
                    lat: lat.toFixed(4), 
                    lng: lng.toFixed(4), 
                    name: data.address?.village || data.address?.town || data.address?.city || data.display_name?.split(',')[0] || 'Unknown Location', 
                    district: data.address?.county || data.address?.state_district || 'N/A', 
                    state: data.address?.state || 'N/A', 
                    country: data.address?.country || 'India' 
                };
                
                const popupContent = `<div style="color: #1e293b; font-family: sans-serif;"><strong style="color: #ef4444; font-size: 14px;">${locationData.name}</strong><br/><span style="font-size: 12px;">${locationData.district}, ${locationData.state}</span><br/><span style="font-size: 11px; color: #64748b;">${locationData.lat}, ${locationData.lng}</span></div>`;
                marker.bindPopup(popupContent).openPopup();
                onLocationSelect(locationData);
            } catch (error) {
                const fallbackData = { lat: lat.toFixed(4), lng: lng.toFixed(4), name: 'Selected Area', district: 'Unknown', state: 'Unknown', country: 'India' };
                onLocationSelect(fallbackData);
            }
        });
        mapInstanceRef.current = map;
        setIsMapReady(true);
    };

    const displayHotspots = () => {
        const L = window.L;
        const map = mapInstanceRef.current;
        
        hotspotMarkersRef.current.forEach(marker => map.removeLayer(marker));
        hotspotMarkersRef.current = [];
        
        hotspots.forEach(hotspot => {
            if (!hotspot.Latitude || !hotspot.Longitude) return;

            const color = HOTSPOT_COLORS[hotspot.Hotspot_Level] || '#64748b';
            
            const hotspotIcon = L.divIcon({ 
                className: 'hotspot-marker', 
                html: `<div style="background: ${color}; border: 2px solid white; border-radius: 50%; width: ${hotspot.Hotspot_Level === 'Red' ? '14px' : hotspot.Hotspot_Level === 'Orange' ? '12px' : '10px'}; height: ${hotspot.Hotspot_Level === 'Red' ? '14px' : hotspot.Hotspot_Level === 'Orange' ? '12px' : '10px'}; box-shadow: 0 0 10px ${color}80; animation: pulse-${hotspot.Hotspot_Level} 2s infinite;"></div>`, 
                iconSize: [14, 14], 
                iconAnchor: [7, 7] 
            });
            
            const marker = L.marker([hotspot.Latitude, hotspot.Longitude], { icon: hotspotIcon })
                .bindTooltip(`<span style="font-weight:bold; color:#f8fafc;">${hotspot.Mine_Name}</span>`, { permanent: true, direction: 'top', offset: [0, -10], className: 'custom-tooltip' })
                .bindPopup(
                    `<div style="color: #1e293b; font-family: sans-serif; min-width: 200px;">
                        <strong style="color: ${color}; font-size: 16px;">${hotspot.Mine_Name}</strong>
                        <br/><span style="font-size: 12px; color: #475569;">${hotspot.District}, ${hotspot.State}</span>
                    </div>`
                )
                .addTo(map);

            marker.on('click', () => {
                const locationData = {
                    lat: hotspot.Latitude.toFixed(4),
                    lng: hotspot.Longitude.toFixed(4),
                    name: hotspot.Mine_Name,
                    district: hotspot.District || 'N/A',
                    state: hotspot.State || 'N/A',
                    country: 'India',
                    level: hotspot.Hotspot_Level,
                    emission: hotspot.Emission_Score
                };
                onLocationSelect(locationData);
                if (markerRef.current) {
                    map.removeLayer(markerRef.current);
                    markerRef.current = null;
                }
            });

            hotspotMarkersRef.current.push(marker);
        });
    };

    return (
        <div className="relative w-full h-full overflow-hidden rounded-xl shadow-inner">
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px', background: '#0f172a' }}></div>
            {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading Interactive Map...</p>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes pulse-Red{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:.5}}
                @keyframes pulse-Orange{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.6}}
                @keyframes pulse-Yellow{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
                .leaflet-container { background: #0f172a !important; }
                .leaflet-popup-content-wrapper { background: rgba(255,255,255,0.95) !important; border-radius: 8px !important; }
                .leaflet-popup-tip { background: rgba(255,255,255,0.95) !important; }
                .custom-tooltip {
                    background-color: rgba(15, 23, 42, 0.9) !important;
                    border: 1px solid rgba(148, 163, 184, 0.2) !important;
                    color: white !important;
                    border-radius: 4px !important;
                    font-size: 11px !important;
                    padding: 2px 6px !important;
                    box-shadow: none !important;
                }
                .leaflet-tooltip-top:before { border-top-color: rgba(15, 23, 42, 0.9) !important; }
            `}</style>
        </div>
    );
};

// --- HotspotStats Component ---

const HotspotStats = ({ stats }) => (
    <GlassCard className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-300 mb-4"><AlertCircle size={20} /> Hotspot Distribution</h3>
        <div className="space-y-4">
            {stats.Red && (<div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-red-500"></div><span className="text-slate-300">Red Zones</span></div><span className="font-bold text-red-400">{stats.Red.count}</span></div>)}
            {stats.Orange && (<div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-orange-500"></div><span className="text-slate-300">Orange Zones</span></div><span className="font-bold text-orange-400">{stats.Orange.count}</span></div>)}
            {stats.Yellow && (<div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-yellow-500"></div><span className="text-slate-300">Yellow Zones</span></div><span className="font-bold text-yellow-400">{stats.Yellow.count}</span></div>)}
            <div className="pt-4 border-t border-slate-700"><div className="flex items-center justify-between"><span className="text-slate-300 font-semibold">Total Hotspots</span><span className="font-bold text-blue-400">{stats.total || 0}</span></div></div>
        </div>
    </GlassCard>
);

// --- Static Data ---

const forecastData = [{year:'2022',value:44.0},{year:'2023',value:45.1},{year:'2024',value:46.2},{year:'2025',value:47.3,forecast:47.3},{year:'2026',forecast:48.9},{year:'2027',forecast:50.5},{year:'2028',value:52.1,forecast:52.1},{year:'2029',forecast:53.7},{year:'2030',forecast:55.3}];
const mitigationData = [{name:'Afforestation',effectiveness:85,icon:TreePine,color:'text-green-400'},{name:'Methane Capture',effectiveness:70,icon:Zap,color:'text-purple-400'},{name:'Land Reclamation',effectiveness:55,icon:Factory,color:'text-blue-400'}];

const Header = () => (<motion.header className="sticky top-0 z-50 flex items-center justify-between p-4 mb-8 bg-slate-900/50 backdrop-blur-lg border-b border-slate-700/50" initial={{y:-100}} animate={{y:0}} transition={{duration:0.5,ease:"easeOut"}}><div className="flex items-center gap-4"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"><Droplet size={24}/></div><h1 className="text-xl font-bold">India's Emission Hotspot Dashboard</h1></div><div className="flex items-center gap-4"><button className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"><Bell size={20}/></button><button className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"><Settings size={20}/></button></div></motion.header>);

const TrendChart = ({data,strokeColor,gradientColor,title,icon:Icon}) => (<GlassCard className="p-6"><h3 className="flex items-center gap-2 text-lg font-semibold text-slate-300 mb-4">{Icon && <Icon size={20}/>} {title} Trend (PPM)</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={data} margin={{top:5,right:20,left:20,bottom:5}}><defs><linearGradient id={`color_${gradientColor}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/><stop offset="95%" stopColor={strokeColor} stopOpacity={0}/></linearGradient></defs><Tooltip contentStyle={{background:'rgba(15, 23, 42, 0.7)',backdropFilter:'blur(5px)',border:'1px solid rgba(255, 255, 255, 0.1)',borderRadius:'8px'}}/><XAxis dataKey="month" stroke="#64748b"/><YAxis stroke="#64748b" type="number"/><Area type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={3} fill={`url(#color_${gradientColor})`}/></AreaChart></ResponsiveContainer></GlassCard>);

const AnimatedCustomLabel = ({cx,cy,midAngle,outerRadius,value,name,fill}) => {const RADIAN=Math.PI/180;const cos=Math.cos(-midAngle*RADIAN);const sx=cx+(outerRadius+5)*cos;const sy=cy+(outerRadius+5)*Math.sin(-midAngle*RADIAN);const mx=cx+(outerRadius+20)*cos;const my=cy+(outerRadius+20)*Math.sin(-midAngle*RADIAN);const ex=mx+(cos>=0?1:-1)*22;const ey=my;const textAnchor=cos>=0?'start':'end';return(<g><motion.path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} fill="none" stroke={fill} strokeWidth={2} initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}} transition={{duration:0.8,ease:"easeInOut",delay:0.5}}/><motion.text x={ex+(cos>=0?1:-1)*12} y={ey} dy={5} textAnchor={textAnchor} fill="#e2e8f0" className="text-sm font-semibold" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5,delay:1.0}}>{`${name} (${value}%)`}</motion.text></g>);};

// --- GasDashboard Component (Renamed Main View) ---

const GasOverview = ({ onNextPage }) => {
    const [mapLocation, setMapLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const handleLocationSelect = useCallback((location) => {setMapLocation(location);}, []);
    const [liveData, setLiveData] = useState({co2Trend:[],ch4Trend:[],pmTrend:[],average:{CO2_ppm:0,CH4_ppm:0,PM10:0,PM2_5:0,NOx_ppm:0,SO2_ppm:0},pie:[]});
    const [hotspots, setHotspots] = useState([]);
    const [hotspotStats, setHotspotStats] = useState({});

    // This function fetches and processes data from backend endpoints
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const monthlyResponse = await fetch('http://127.0.0.1:8000/api/v1/emissions/monthly/');
            const monthlyData = await (monthlyResponse.ok ? monthlyResponse.json() : []);
            
            const averageResponse = await fetch('http://127.0.0.1:8000/api/v1/emissions/average/');
            const averageData = await (averageResponse.ok ? averageResponse.json() : {});

            const hotspotResponse = await fetch('http://127.0.0.1:8000/api/v1/hotspots?limit=1000');
            const hotspotData = await (hotspotResponse.ok ? hotspotResponse.json() : { data: [] });

            const statsResponse = await fetch('http://127.0.0.1:8000/api/v1/hotspots/stats');
            const statsData = await (statsResponse.ok ? statsResponse.json() : { stats: {} });

            const monthlyRaw = monthlyData.map(item => ({month: item.Month || 'N/A', CO2_ppm: item.CO2_ppm || 0, CH4_ppm: item.CH4_ppm || 0, PM10: item.PM10 || 0, PM2_5: item.PM2_5 || 0}));
            
            const averageMetrics = {
                CO2_ppm: averageData.average_emissions_ppm?.CO2_ppm || 0, 
                CH4_ppm: averageData.average_emissions_ppm?.CH4_ppm || 0, 
                PM10: averageData.average_emissions_ppm?.PM10 || 0, 
                PM2_5: averageData.average_emissions_ppm?.PM2_5 || 0, 
                NOx_ppm: averageData.average_emissions_ppm?.NOx_ppm || 0, 
                SO2_ppm: averageData.average_emissions_ppm?.SO2_ppm || 0
            };
            
            const co2TrendData = monthlyRaw.map(item => ({month:item.month,value:parseFloat(item.CO2_ppm).toFixed(2)||0}));
            const ch4TrendData = monthlyRaw.map(item => ({month:item.month,value:parseFloat(item.CH4_ppm).toFixed(2)||0}));
            const pmTrendData = monthlyRaw.map(item => ({month:item.month,PM10:parseFloat(item.PM10).toFixed(2)||0,'PM2.5':parseFloat(item.PM2_5).toFixed(2)||0}));
            const total = Object.values(averageMetrics).reduce((sum,val) => sum+parseFloat(val||0),0);
            const calculatePercentage = (value) => total>0?((value/total)*100).toFixed(1):0;
            const pieDataLive = [{name:'CO₂',value:parseFloat(calculatePercentage(averageMetrics.CO2_ppm)),actual:parseFloat(averageMetrics.CO2_ppm||0)},{name:'CH₄',value:parseFloat(calculatePercentage(averageMetrics.CH4_ppm)),actual:parseFloat(averageMetrics.CH4_ppm||0)},{name:'NOx',value:parseFloat(calculatePercentage(averageMetrics.NOx_ppm)),actual:parseFloat(averageMetrics.NOx_ppm||0)},{name:'SO₂',value:parseFloat(calculatePercentage(averageMetrics.SO2_ppm)),actual:parseFloat(averageMetrics.SO2_ppm||0)},{name:'PM10',value:parseFloat(calculatePercentage(averageMetrics.PM10)),actual:parseFloat(averageMetrics.PM10||0)},{name:'PM2.5',value:parseFloat(calculatePercentage(averageMetrics.PM2_5)),actual:parseFloat(averageMetrics.PM2_5||0)}].filter(d => d.actual>0);
            
            setLiveData({co2Trend:co2TrendData,ch4Trend:ch4TrendData,pmTrend:pmTrendData,average:averageMetrics,pie:pieDataLive});
            setHotspots(hotspotData.data || []);
            setHotspotStats(statsData.stats || {});
            
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {fetchAllData();}, [fetchAllData]);
    useEffect(() => {if(!mapLocation){setMapLocation({lat:'20.5000',lng:'85.5000',name:"Default Mining Area",district:"Angul",state:"Odisha",country:"India"});}}, [mapLocation]);
    
    if (isLoading) return <Loader />;

    return (
        <div className="relative min-h-screen w-full font-sans text-white bg-slate-900">
            <Header />
            <motion.main className="px-8 pb-8" initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:0.15,delayChildren:0.2}}}}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-1 flex flex-col gap-8">
                        <CsvUploadTool onUploadSuccess={fetchAllData} />
                        <HotspotStats stats={hotspotStats} />
                        <GlassCard className="p-6 text-center h-[450px]">
                            <h3 className="text-lg font-semibold text-slate-300 mb-4">Overall Emission Composition</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{top:40,right:40,bottom:40,left:40}}>
                                    <Pie data={liveData.pie} cx="50%" cy="50%" labelLine={false} label={<AnimatedCustomLabel />} innerRadius={80} outerRadius={100} dataKey="value" paddingAngle={5}>
                                        {liveData.pie.map((entry,index) => (<Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]} stroke="none" />))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </GlassCard>
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-semibold text-slate-300 mb-6">Live Avg KPIs (PPM)</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4"><Factory className="w-8 h-8 text-purple-400 flex-shrink-0" /><div><div className="text-sm text-slate-400">Avg CO₂ (PPM)</div><div className="text-xl font-bold">{parseFloat(liveData.average.CO2_ppm).toFixed(2)}</div></div></div>
                                <div className="flex items-center gap-4"><Leaf className="w-8 h-8 text-green-400 flex-shrink-0" /><div><div className="text-sm text-slate-400">Avg CH₄ (PPM)</div><div className="text-xl font-bold">{parseFloat(liveData.average.CH4_ppm).toFixed(2)}</div></div></div>
                            </div>
                        </GlassCard>
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-1 gap-8">
                        <TrendChart data={liveData.co2Trend} strokeColor="#3b82f6" gradientColor="blue" title="CO₂" icon={Factory} />
                        <TrendChart data={liveData.ch4Trend} strokeColor="#8b5cf6" gradientColor="purple" title="CH₄" icon={Zap} />
                        <GlassCard className="p-6">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-300 mb-4"><BarChartHorizontal size={20} /> Particulate Matter Trend</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={liveData.pmTrend} margin={{top:5,right:20,left:20,bottom:5}}>
                                    <defs><linearGradient id="color_pm10" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient><linearGradient id="color_pm25" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/><stop offset="95%" stopColor="#eab308" stopOpacity={0}/></linearGradient></defs>
                                    <Tooltip contentStyle={{background:'rgba(15, 23, 42, 0.7)',backdropFilter:'blur(5px)',border:'1px solid rgba(255, 255, 255, 0.1)',borderRadius:'8px'}}/>
                                    <XAxis dataKey="month" stroke="#64748b" interval={0} /><YAxis stroke="#64748b" /><Legend verticalAlign="top" height={36}/>
                                    <Area type="monotone" dataKey="PM10" name="PM10 (PPM)" stroke="#10b981" strokeWidth={3} fill="url(#color_pm10)" />
                                    <Area type="monotone" dataKey="PM2.5" name="PM2.5 (PPM)" stroke="#eab308" strokeWidth={3} fill="url(#color_pm25)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </GlassCard>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <GlassCard className="lg:col-span-2 p-4 min-h-[600px] flex flex-col">
                        <h3 className="text-xl font-semibold text-slate-300 mb-4 px-2 flex items-center gap-2">
                            <Map size={20}/> Emission Hotspot Map
                            <span className="text-sm text-blue-400 ml-auto">{hotspots.length} hotspots loaded</span>
                        </h3>
                        <div className="flex flex-col md:flex-row flex-grow min-h-0">
                            <div className="w-full md:w-2/3 h-[400px] md:h-full relative p-2">
                                <InteractiveRealMap onLocationSelect={handleLocationSelect} hotspots={hotspots} />
                            </div>
                            
                            <div className="w-full md:w-1/3 p-4 md:pl-6 md:border-l border-slate-700 flex flex-col justify-start gap-6">
                                <h4 className="text-2xl font-bold text-red-400">Analysis Panel</h4>
                                {mapLocation ? (
                                    <div className="space-y-4 text-sm">
                                        <p><span className="text-slate-400">Location:</span> <span className="font-bold text-white">{mapLocation.name}</span></p>
                                        <p><span className="text-slate-400">Coordinates:</span> <span className="font-mono text-purple-400">{mapLocation.lat}, {mapLocation.lng}</span></p>
                                        <p><span className="text-slate-400">District:</span> <span className="font-bold text-yellow-400">{mapLocation.district}</span></p>
                                        <p><span className="text-slate-400">State:</span> <span className="font-bold text-yellow-400">{mapLocation.state}</span></p>
                                        {mapLocation.level && (
                                            <p><span className="text-slate-400">Level:</span> <span className={`font-bold ${mapLocation.level === 'Red' ? 'text-red-500' : mapLocation.level === 'Orange' ? 'text-orange-500' : 'text-yellow-500'}`}>{mapLocation.level}</span></p>
                                        )}
                                        {mapLocation.emission && (
                                            <p><span className="text-slate-400">Emission Score:</span> <span className="font-bold text-white">{parseFloat(mapLocation.emission).toFixed(2)}</span></p>
                                        )}
                                        <div className="mt-6">
                                            <h5 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2"><LocateFixed size={16}/> Hotspot Legend</h5>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Red: High emission zones</span></div>
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Orange: Medium zones</span></div>
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Yellow: Low zones</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-base">Click the map to select a location.</div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                    <div className="lg:col-span-1 flex flex-col gap-8">
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-semibold text-slate-300 mb-6">Mitigation Project Effectiveness</h3>
                            <div className="space-y-6">
                                {mitigationData.map((project) => (
                                    <div key={project.name}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <project.icon className={`w-6 h-6 ${project.color}`} />
                                            <span className="font-semibold">{project.name}</span>
                                            <span className="ml-auto text-slate-300">{project.effectiveness}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                                            <motion.div 
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full" 
                                                initial={{width:0}} 
                                                animate={{width: `${project.effectiveness}%`}} 
                                                transition={{duration:1,ease:'easeOut',delay:0.2}}
                                            ></motion.div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-lg font-semibold text-slate-300 mb-4">Emission Forecast (vs. 2030 Target)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={forecastData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                                    <XAxis dataKey="year" stroke="#64748b" />
                                    <YAxis stroke="#64748b" />
                                    <defs>
                                        <linearGradient id="color_blue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={3} fill="url(#color_blue)" />
                                    <Area type="monotone" dataKey="forecast" stroke="#f472b6" strokeWidth={3} strokeDasharray="5 5" fill="none" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </GlassCard>
                    </div>
                </div>

                {/* --- NAVIGATION BUTTON TO MINE OFFSET DASHBOARD --- */}
                <div className="mt-12 flex justify-center pb-12">
                    <button 
                        onClick={onNextPage}
                        className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 rounded-xl font-bold text-lg shadow-xl shadow-green-900/20 hover:scale-105 transition-all duration-300 border border-green-400/30"
                    >
                        Proceed to Mine Offset Planning
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.main>
        </div>
    );
};

// --- MineOffsetDashboard Component (Target Page) ---

const KPICard = ({ icon: Icon, label, value, unit, status, statusColor }) => (
    <GlassCard className="p-6 hover:border-blue-400/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        {status && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {status}
          </span>
        )}
      </div>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">
        {value} <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </GlassCard>
);

const TreeSpeciesCard = ({ species, count, cost, asr, offset, color }) => (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <h4 className="text-lg font-semibold text-white">{species}</h4>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-slate-400">Tree Count</div>
          <div className="text-xl font-bold text-white">{count?.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-400">Total Cost</div>
          <div className="text-xl font-bold text-green-400">₹{cost?.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-400">ASR (kg/yr)</div>
          <div className="text-lg font-semibold text-blue-400">{asr}</div>
        </div>
        <div>
          <div className="text-slate-400">Offset (tonnes)</div>
          <div className="text-lg font-semibold text-purple-400">{offset?.toFixed(2)}</div>
        </div>
      </div>
    </GlassCard>
);

const ScenarioCard = ({ title, trees, cost, icon: Icon }) => (
  <GlassCard className="p-5 hover:scale-105 transition-transform duration-300">
    <div className="flex items-center gap-3 mb-3">
      <Icon className="w-5 h-5 text-yellow-400" />
      <h4 className="text-base font-semibold text-slate-300">{title}</h4>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm text-slate-400">Total Trees</span>
        <span className="font-bold text-white">{trees?.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-slate-400">Total Cost</span>
        <span className="font-bold text-green-400">₹{cost?.toLocaleString()}</span>
      </div>
    </div>
  </GlassCard>
);

const MineOffsetDashboard = ({ onBack }) => {
    const [searchTerm, setSearchTerm] = useState(""); // Default empty to avoid mock call
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- MAIN API FETCH FUNCTION ---
    const fetchMineData = useCallback(async (mineName) => {
        setLoading(true);
        setError(null);
        try {
            // --- CORRECTION: Added '/emissions' to the URL to match router prefix ---
            const response = await fetch(`http://127.0.0.1:8000/api/v1/emissions/mine-offsets?name=${encodeURIComponent(mineName)}`);
            
            if (!response.ok) {
                throw new Error('Backend response was not ok');
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            console.warn("Backend fetch failed.", err);
            setError("Failed to fetch data. Please ensure backend is running.");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only fetch if searchTerm is not empty
        if (searchTerm) {
            fetchMineData(searchTerm);
        }
    }, [fetchMineData]); 
    
    const handleSearch = () => {
        if(searchTerm.trim() !== "") {
            fetchMineData(searchTerm);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p>Loading Offset Data...</p>
                </div>
            </div>
        );
    }

    if (!data) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
            <header className="absolute top-0 z-50 w-full bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Mine-Wise Offset Intelligence</h1>
                            <p className="text-sm text-slate-400">Carbon Neutrality Planning & Analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-600 rounded-lg p-1 pl-3">
                        <input 
                            type="text" 
                            placeholder="Search mine..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-transparent border-none focus:outline-none text-white placeholder-slate-400 w-48 sm:w-64"
                        />
                        <button onClick={handleSearch} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors">
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            </header>
            <div className="mt-20 text-center">
                <h2 className="text-xl font-bold mb-2">No Data Displayed</h2>
                <p className="text-slate-400 mb-4">Search for a mine to view offset intelligence.</p>
                {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-lg">{error}</p>}
            </div>
        </div>
    );

    const costDistribution = [
        { name: 'Teak', value: data.tree_plan?.teak?.total_cost || 0 },
        { name: 'Acacia', value: data.tree_plan?.acacia?.total_cost || 0 },
        { name: 'Pioneer', value: data.tree_plan?.pioneer?.total_cost || 0 }
    ].filter(d => d.value > 0);

    const landCompliance = [
        { name: 'Required', value: data.kpis?.land_required_ha || 0, fill: '#ef4444' },
        { name: 'Available', value: data.kpis?.land_available_ha || 0, fill: '#10b981' }
    ];

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
                    <ArrowLeft size={24} />
                </button>
                <div>
                <h1 className="text-2xl font-bold">Mine-Wise Offset Intelligence</h1>
                <p className="text-sm text-slate-400">Carbon Neutrality Planning & Analysis</p>
                </div>
            </div>
            {/* --- SEARCH BAR --- */}
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-600 rounded-lg p-1 pl-3">
                <input 
                    type="text" 
                    placeholder="Search mine..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-transparent border-none focus:outline-none text-white placeholder-slate-400 w-48 sm:w-64"
                />
                <button onClick={handleSearch} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors">
                    <Search size={18} />
                </button>
            </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto p-6 space-y-8">
            <GlassCard className="p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                    <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{data.mine_metadata?.mine_name}</h2>
                    <div className="flex gap-4 mt-2 text-sm text-slate-400">
                    <span>📍 {data.mine_metadata?.district}, {data.mine_metadata?.state}</span>
                    </div>
                </div>
                </div>
            </div>
            </GlassCard>

            <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" /> Key Performance Indicators
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard icon={Factory} label="Annual Offset Target" value={data.kpis?.annual_offset_target_tonnes?.toLocaleString()} unit="tonnes CO₂e" />
                <KPICard icon={TreePine} label="Total Trees Required" value={data.kpis?.total_trees_required?.toLocaleString()} unit="trees" />
                <KPICard icon={DollarSign} label="Estimated Budget" value={`₹${data.kpis?.estimated_budget_inr?.toLocaleString()}`} unit="" />
                <KPICard icon={Leaf} label="Land Required" value={data.kpis?.land_required_ha?.toFixed(2)} unit="hectares" />
                <KPICard icon={MapPin} label="Land Available" value={data.kpis?.land_available_ha?.toFixed(2)} unit="hectares" status={data.kpis?.land_status} statusColor="bg-green-500/20 text-green-400" />
                <KPICard icon={Droplet} label="Water Conserved" value={data.water_conservation?.total_water_conserved_kilolitres?.toLocaleString()} unit="kL/year" />
            </div>
            </div>

            {/* --- Tree Plantation Plan --- */}
            <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TreePine size={20} className="text-green-400" /> Tree Plantation Strategy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TreeSpeciesCard species="Teak (Premium)" count={data.tree_plan?.teak?.count} cost={data.tree_plan?.teak?.total_cost} asr={data.tree_plan?.teak?.asr_per_tree} offset={data.tree_plan?.teak?.offset_contribution_tonnes} color="bg-blue-500" />
                <TreeSpeciesCard species="Acacia (Nitrogen Fixing)" count={data.tree_plan?.acacia?.count} cost={data.tree_plan?.acacia?.total_cost} asr={data.tree_plan?.acacia?.asr_per_tree} offset={data.tree_plan?.acacia?.offset_contribution_tonnes} color="bg-purple-500" />
                <TreeSpeciesCard species="Pioneer Mix (Fast Growth)" count={data.tree_plan?.pioneer?.count} cost={data.tree_plan?.pioneer?.total_cost} asr={data.tree_plan?.pioneer?.asr_per_tree} offset={data.tree_plan?.pioneer?.offset_contribution_tonnes} color="bg-green-500" />
            </div>
            </div>

            {/* --- Waste-to-Wealth & Carbon Credits (Added per requirement) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" />
                    Waste-to-Wealth Conversion
                    </h3>
                    <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">Methane Captured</span>
                        <span className="font-bold text-white">{data.waste_to_wealth?.annual_methane_captured_kg?.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">Ethanol Production</span>
                        <span className="font-bold text-green-400">{data.waste_to_wealth?.ethanol_production_litres?.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">Water Required</span>
                        <span className="font-bold text-blue-400">{data.waste_to_wealth?.water_required_litres?.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-900/30 to-green-800/30 rounded-lg border border-green-500/30">
                        <span className="text-slate-300">Estimated Revenue</span>
                        <span className="font-bold text-2xl text-green-400">₹{data.waste_to_wealth?.estimated_revenue_inr?.toLocaleString()}</span>
                    </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-green-400" />
                    Carbon Credit Potential
                    </h3>
                    <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">Offset Credits</span>
                        <span className="font-bold text-white">{data.carbon_credits?.total_offset_credits_tonnes?.toLocaleString()} tonnes</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">Market Price</span>
                        <span className="font-bold text-yellow-400">₹{data.carbon_credits?.market_price_per_credit_inr?.toLocaleString()}/credit</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-lg border border-purple-500/30">
                        <span className="text-slate-300">Total Revenue Potential</span>
                        <span className="font-bold text-2xl text-purple-400">₹{data.carbon_credits?.total_revenue_potential_inr?.toLocaleString()}</span>
                    </div>
                    </div>
                </GlassCard>
            </div>

            {/* --- What-If Scenarios (Added per requirement) --- */}
            <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Leaf size={20} className="text-yellow-400" />
                    Alternative Plantation Scenarios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ScenarioCard
                    title="Low Budget Plan (100% Pioneer)"
                    trees={data.what_if_scenarios?.low_budget?.total_trees}
                    cost={data.what_if_scenarios?.low_budget?.total_cost}
                    icon={TreePine}
                    />
                    <ScenarioCard
                    title="High Efficiency Plan (100% Teak)"
                    trees={data.what_if_scenarios?.high_efficiency?.total_trees}
                    cost={data.what_if_scenarios?.high_efficiency?.total_cost}
                    icon={Zap}
                    />
                </div>
            </div>

            {/* --- Charts Section (Includes Monthly Emissions Trend per requirement) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Cost Distribution by Species</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={costDistribution} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}`} outerRadius={80} fill="#8884d8" dataKey="value">
                                {costDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Land Compliance Analysis</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={landCompliance}>
                            <XAxis dataKey="name" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {landCompliance.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>

                {data.graphs?.monthly_emissions && (
                    <GlassCard className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Monthly Emissions Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.graphs.monthly_emissions}>
                        <XAxis dataKey="month_year" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                            contentStyle={{
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="emission_index"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 4 }}
                        />
                        </LineChart>
                    </ResponsiveContainer>
                    </GlassCard>
                )}
            </div>
        </main>
        </div>
    );
};

// --- Main App Component ---

const GasDashboard = () => {
    // Controls which dashboard is currently visible
    const [currentView, setCurrentView] = useState('gas'); // 'gas' or 'mine'

    return (
        <>
            {currentView === 'gas' ? (
                <GasOverview onNextPage={() => setCurrentView('mine')} />
            ) : (
                <MineOffsetDashboard onBack={() => setCurrentView('gas')} />
            )}
        </>
    );
};

export default GasDashboard;