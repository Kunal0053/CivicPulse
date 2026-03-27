import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MapPin, Bell, Info, ShieldCheck, Plus, Trash2, Edit3, 
  BarChart3, X, ChevronRight, Navigation, Settings, Lock, LogOut
} from 'lucide-react';

// --- CONFIGURATION ---
// Change this to your local or deployed server URL
const API_BASE_URL = 'https://civicpulse-y078.onrender.com';

const App = () => {
  const [projects, setProjects] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [analytics, setAnalytics] = useState({ alertsTriggered: 0 });
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});
  const userMarkerRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '', description: '', budget: '', timeline: '', 
    status: 'Ongoing', civicImpact: '', radius: 500,
    lat: 20.5937, lng: 78.9629, mediaUrl: ''
  });

  // 1. Axios Instance with Auth
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });

  // 2. Load Leaflet CDN
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // 3. Data Fetching
  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error("Error fetching projects", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error("Error fetching analytics", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchAnalytics();
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchProjects();
      fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 4. Auth Actions
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
      setToken(res.data.token);
      localStorage.setItem('adminToken', res.data.token);
      setShowLogin(false);
      setShowAdminPanel(true);
    } catch (err) {
      alert("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setShowAdminPanel(false);
  };

  // 5. Map Initialization & Updates
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance.current) return;

    mapInstance.current = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletLoaded || !mapInstance.current) return;

    projects.forEach(proj => {
      if (!markersRef.current[proj._id]) {
        const marker = window.L.marker([proj.lat, proj.lng]).addTo(mapInstance.current);
        marker.on('click', () => setActiveProject(proj));
        markersRef.current[proj._id] = marker;

        const circle = window.L.circle([proj.lat, proj.lng], {
          radius: proj.radius,
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(mapInstance.current);
        circlesRef.current[proj._id] = circle;
      } else {
        markersRef.current[proj._id].setLatLng([proj.lat, proj.lng]);
        circlesRef.current[proj._id].setLatLng([proj.lat, proj.lng]);
        circlesRef.current[proj._id].setRadius(proj.radius);
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!projects.find(p => p._id === id)) {
        mapInstance.current.removeLayer(markersRef.current[id]);
        mapInstance.current.removeLayer(circlesRef.current[id]);
        delete markersRef.current[id];
        delete circlesRef.current[id];
      }
    });

    if (userLocation) {
      if (!userMarkerRef.current) {
        const userIcon = window.L.divIcon({
          className: 'user-location-icon',
          html: `<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
          iconSize: [16, 16]
        });
        userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(mapInstance.current);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }
  }, [projects, userLocation, leafletLoaded]);

  // 6. Geofencing Logic
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        projects.forEach(project => {
          const dist = haversineDistance(latitude, longitude, project.lat, project.lng);
          if (dist <= project.radius) triggerNotification(project);
        });
      },
      null,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [projects]);

  const triggerNotification = async (project) => {
    const lastNotified = localStorage.getItem(`notify_${project._id}`);
    const now = Date.now();
    if (lastNotified && (now - lastNotified < 300000)) return;

    setNotifications(prev => [{
      id: now,
      title: "Impact Zone Alert!",
      message: `You are near ${project.name}. Did you know? ${project.civicImpact}`,
      project: project
    }, ...prev].slice(0, 3));
    
    localStorage.setItem(`notify_${project._id}`, now.toString());
    
    // Sync trigger with backend analytics
    try { await api.post('/analytics/trigger'); fetchAnalytics(); } catch(e){}
  };

  // 7. Project CRUD
  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject._id}`, formData);
      } else {
        await api.post('/projects', formData);
      }
      setIsFormOpen(false);
      setEditingProject(null);
      resetForm();
      fetchProjects();
    } catch (err) { console.error(err); }
  };

  const deleteProject = async (id) => {
    if (window.confirm("Remove this project and its geofence?")) {
      try {
        await api.delete(`/projects/${id}`);
        fetchProjects();
      } catch (err) { console.error(err); }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', budget: '', timeline: '', 
      status: 'Ongoing', civicImpact: '', radius: 500,
      lat: userLocation?.lat || 20.5937, lng: userLocation?.lng || 78.9629, mediaUrl: ''
    });
  };

  const flyToLocation = (lat, lng) => {
    if (mapInstance.current) mapInstance.current.flyTo([lat, lng], 15);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-[1001] shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
            <Navigation className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">CivicPulse</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">API Backend Active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  showAdminPanel ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {showAdminPanel ? 'Exit Admin' : 'Admin Panel'}
              </button>
              <button onClick={handleLogout} className="p-2.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-100"
            >
              <Lock className="w-4 h-4" /> Admin Login
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        <div className={`flex-1 relative transition-all duration-500 ${showAdminPanel || showLogin ? 'opacity-40 blur-sm grayscale' : 'opacity-100'}`} ref={mapRef} />

        {/* Analytics Bar */}
        {!showAdminPanel && !showLogin && (
           <div className="absolute top-6 left-6 z-[1000] flex gap-2">
             <div className="bg-white/80 backdrop-blur-md border border-white p-3 rounded-2xl shadow-xl flex items-center gap-3">
               <div className="bg-blue-100 p-2 rounded-xl"><BarChart3 className="w-4 h-4 text-blue-600" /></div>
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Total Impressions</p>
                 <p className="text-lg font-black text-slate-800 leading-none">{analytics.alertsTriggered}</p>
               </div>
             </div>
           </div>
        )}

        {/* Login Modal */}
        {showLogin && (
          <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md animate-in zoom-in-95">
              <div className="text-center mb-8">
                <div className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-100">
                  <Lock className="text-white w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-800">Secure Access</h2>
                <p className="text-slate-400">Enter admin credentials to continue</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold" 
                  placeholder="Username"
                  onChange={e => setLoginData({...loginData, username: e.target.value})}
                />
                <input 
                  type="password"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold" 
                  placeholder="Password"
                  onChange={e => setLoginData({...loginData, password: e.target.value})}
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100">Sign In</button>
                <button type="button" onClick={() => setShowLogin(false)} className="w-full text-slate-400 font-bold py-2">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {/* Floating Notifications */}
        <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3 w-80 pointer-events-none">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-white/95 backdrop-blur-xl border border-white shadow-2xl p-4 rounded-3xl pointer-events-auto animate-in slide-in-from-right-8">
               <div className="flex justify-between items-start mb-2">
                 <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">Impact Zone</span>
                 <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4"/></button>
               </div>
               <h4 className="font-bold text-slate-900 leading-tight">{notif.title}</h4>
               <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
               <button 
                  onClick={() => { setActiveProject(notif.project); flyToLocation(notif.project.lat, notif.project.lng); }}
                  className="mt-3 w-full py-2 bg-slate-50 text-blue-600 text-xs font-bold rounded-xl transition-colors"
                >
                  Explore Site Details
                </button>
            </div>
          ))}
        </div>

        {/* Project Detail Overlay */}
        {activeProject && !showAdminPanel && !showLogin && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-[1001] animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
              <div className="relative h-48 bg-slate-100">
                {activeProject.mediaUrl ? (
                  <img src={activeProject.mediaUrl} className="w-full h-full object-cover" alt={activeProject.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 opacity-90">
                    <Navigation className="w-16 h-16 text-white/20" />
                  </div>
                )}
                <button onClick={() => setActiveProject(null)} className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-black text-slate-800 mb-2">{activeProject.name}</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">{activeProject.description}</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Budget</p><p className="font-black text-slate-700">{activeProject.budget}</p></div>
                  <div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Timeline</p><p className="font-black text-slate-700">{activeProject.timeline}</p></div>
                </div>
                <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-100">
                   <p className="text-xs opacity-70 font-bold uppercase mb-1">Civic Impact</p>
                   <p className="text-sm opacity-90 leading-snug">{activeProject.civicImpact}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Side Panel */}
        {showAdminPanel && (
          <div className="absolute inset-0 z-[1100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAdminPanel(false)} />
            <div className="w-full max-w-3xl bg-white h-full relative z-[1101] shadow-2xl flex flex-col animate-in slide-in-from-right-full">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div><h2 className="text-4xl font-black text-slate-800 tracking-tight">Geo-Manager</h2><p className="text-slate-400 font-medium">Manage Site Deployments</p></div>
                <button onClick={() => { setEditingProject(null); resetForm(); setIsFormOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-blue-100 active:scale-95"><Plus /> Create Site</button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-6">
                {projects.map(proj => (
                  <div key={proj._id} className="bg-white border-2 border-slate-50 p-6 rounded-[32px] hover:border-blue-100 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">{proj.status}</span>
                        <h3 className="text-2xl font-black text-slate-800 leading-tight">{proj.name}</h3>
                        <div className="flex gap-4 mt-6">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><MapPin className="w-3.5 h-3.5" /> {proj.radius}m</div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><BarChart3 className="w-3.5 h-3.5" /> {proj.budget}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => { setEditingProject(proj); setFormData(proj); setIsFormOpen(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Edit3 className="w-5 h-5" /></button>
                        <button onClick={() => deleteProject(proj._id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Project Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl relative z-[1201] overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800">{editingProject ? 'Modify' : 'Launch'} Site</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-300"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleSaveProject} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[70vh]">
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Project Name</label><input required className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Description</label><textarea required rows="2" className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-medium resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Radius (Meters)</label><input type="number" required className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} /></div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
                <select className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option>Ongoing</option><option>Completed</option><option>Planned</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Latitude</label><input type="number" step="any" required className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Longitude</label><input type="number" step="any" required className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} /></div>
              <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Civic Impact (Notifications)</label><textarea required rows="2" className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold resize-none" value={formData.civicImpact} onChange={e => setFormData({...formData, civicImpact: e.target.value})} /></div>
              <div className="md:col-span-2 pt-4"><button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-200 active:scale-95">{editingProject ? 'Update targeting' : 'Activate Site'}</button></div>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-100 px-6 py-3 text-[10px] font-bold text-slate-300 flex justify-between shrink-0 uppercase tracking-widest">
        <span>CivicPulse V2.0 (Full-Stack)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${userLocation ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} /> {userLocation ? 'GPS: Locked' : 'GPS: Seeking'}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;