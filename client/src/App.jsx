import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MapPin, Bell, BarChart3, X, Plus, Trash2, Edit3,
  Navigation, Lock, LogOut, Shield, Globe, Users,
  Building2, TrendingUp, CheckCircle, ArrowRight,
  Star, MessageSquare, Eye, Activity, Smartphone,
  Database, AlertTriangle, ChevronRight
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const categoryColors = {
  Hospital: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#f87171', dot: '#ef4444' },
  Road:     { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#60a5fa', dot: '#3b82f6' },
  Bridge:   { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fbbf24', dot: '#f59e0b' },
  College:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', dot: '#10b981' },
};

// ─── Shared Components ────────────────────────────────────────────────────────
const SectionBadge = ({ children, color = 'green' }) => {
  const map = {
    green:  'border-emerald-500/40 text-emerald-400',
    blue:   'border-blue-500/40 text-blue-400',
    orange: 'border-orange-500/40 text-orange-400',
    purple: 'border-purple-500/40 text-purple-400',
  };
  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase ${map[color]}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      {children}
    </span>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, badge, badgeColor = '#3b82f6', iconBg = 'rgba(59,130,246,0.15)' }) => (
  <div className="rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-xl" style={{ background: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: badgeColor }} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg"
        style={{ color: badgeColor, background: `${badgeColor}18` }}>
        {badge}
      </span>
    </div>
    <h3 className="text-white font-bold text-base mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const StepCard = ({ num, icon: Icon, title, desc }) => (
  <div className="flex flex-col items-center text-center p-6">
    <div className="relative mb-5">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{num}</span>
    </div>
    <h4 className="text-white font-bold mb-2">{title}</h4>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

// ─── Geofence Alert Popup ─────────────────────────────────────────────────────
const GeofencePopup = ({ project, onClose, onViewDetails }) => {
  if (!project) return null;
  const cat = categoryColors[project.category] || categoryColors.Road;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border animate-bounce-once"
        style={{ background: '#0d1526', borderColor: 'rgba(59,130,246,0.3)' }}>
        {/* Pulsing top bar */}
        <div className="h-1.5 w-full animate-pulse" style={{ background: `linear-gradient(90deg, ${cat.dot}, #3b82f6)` }} />
        <div className="p-8">
          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: cat.dot }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: `${cat.dot}20`, border: `2px solid ${cat.dot}60` }}>
                <MapPin className="w-9 h-9" style={{ color: cat.dot }} />
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-xs font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full inline-block"
              style={{ color: cat.text, background: cat.bg, border: `1px solid ${cat.border}` }}>
              {project.category} Zone Detected
            </div>
            <h2 className="text-2xl font-black text-white mt-3 mb-2">You're inside a development zone!</h2>
            <h3 className="text-lg font-bold mb-3" style={{ color: cat.dot }}>{project.name}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{project.civicImpact}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Budget</div>
              <div className="text-white font-bold text-sm">{project.budget || 'N/A'}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Status</div>
              <div className="text-white font-bold text-sm">{project.status}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { onViewDetails(project); onClose(); }}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: '#3b82f6' }}>
              View Full Details
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white border transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Project Detail Panel ─────────────────────────────────────────────────────
const ProjectDetailPanel = ({ project, onClose, rating, hoverRating, setRating, setHoverRating, ratingSubmitted, feedback, setFeedback, onSubmitReview }) => {
  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 opacity-30"
        style={{ background: 'rgba(59,130,246,0.15)' }}>
        <MapPin className="w-8 h-8 text-blue-400" />
      </div>
      <p className="text-slate-500 font-medium">Click any pin on the map<br />to view project details</p>
    </div>
  );

  const cat = categoryColors[project.category] || categoryColors.Road;
  const progress = project.status === 'Completed' ? 100 : project.status === 'Ongoing' ? 60 : 20;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Close + header */}
      <div className="flex items-center justify-between p-5 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase px-3 py-1 rounded-full"
            style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
            {project.category}
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${project.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : project.status === 'Ongoing' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'}`}>
            {project.status}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Image */}
        {project.mediaUrl ? (
          <div className="rounded-xl overflow-hidden h-32">
            <img src={project.mediaUrl} className="w-full h-full object-cover" alt={project.name} />
          </div>
        ) : (
          <div className="rounded-xl h-24 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${cat.dot}20, rgba(59,130,246,0.15))` }}>
            <Building2 className="w-10 h-10 opacity-30 text-white" />
          </div>
        )}

        <div>
          <h2 className="text-xl font-black text-white mb-1">{project.name}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{project.description}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[['Budget', project.budget || 'N/A'], ['Timeline', project.timeline || 'N/A']].map(([l, v]) => (
            <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{l}</div>
              <div className="text-white font-bold text-sm">{v}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: cat.dot }} />
          </div>
        </div>

        {/* Civic impact */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-2 font-bold">Civic Impact</div>
          <p className="text-slate-300 text-sm leading-relaxed">{project.civicImpact}</p>
        </div>

        {/* Rating */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-sm">Rate this project</span>
            <span className="text-xs text-yellow-400 font-bold">★ {project.avgRating || 0} ({project.ratings?.length || 0})</span>
          </div>
          {ratingSubmitted ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" /> Thanks for your review!
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
                    className="text-xl transition-transform hover:scale-110">
                    <span style={{ color: n <= (hoverRating || rating) ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>
                      {n <= (hoverRating || rating) ? '★' : '☆'}
                    </span>
                  </button>
                ))}
              </div>
              <textarea rows="2" value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none resize-none mb-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
              <button onClick={onSubmitReview} disabled={!rating && !feedback.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-30"
                style={{ background: '#3b82f6' }}>
                Submit Review
              </button>
            </>
          )}
        </div>

        {/* Community reviews */}
        {project.feedbacks?.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Community ({project.feedbacks.length})
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {project.feedbacks.slice().reverse().map((f, i) => (
                <div key={i} className="rounded-lg p-2.5 text-xs text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>{f.text}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [projects, setProjects]           = useState([]);
  const [userLocation, setUserLocation]   = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [analytics, setAnalytics]         = useState({ alertsTriggered: 0 });
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeFilter, setActiveFilter]   = useState('All');
  const [navScrolled, setNavScrolled]     = useState(false);
  const [geofenceAlert, setGeofenceAlert] = useState(null); // prominent popup
  const [locError, setLocError]           = useState(false);

  // Panel review state
  const [rating, setRating]               = useState(0);
  const [hoverRating, setHoverRating]     = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [feedback, setFeedback]           = useState('');

  // Auth
  const [token, setToken]       = useState(localStorage.getItem('adminToken'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);

  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef({});
  const circlesRef  = useRef({});
  const userMarkerRef = useRef(null);
  const mapSectionRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', description: '', budget: '', timeline: '',
    status: 'Ongoing', civicImpact: '', radius: 500,
    lat: 20.5937, lng: 78.9629, mediaUrl: '', category: 'Road'
  });

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });

  // Navbar scroll
  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Load Leaflet
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
    return () => { document.head.removeChild(link); document.head.removeChild(script); };
  }, []);

  // Data
  const fetchProjects = async () => {
    try { const r = await api.get('/projects'); setProjects(r.data); } catch {}
  };
  const fetchAnalytics = async () => {
    try { const r = await api.get('/analytics'); setAnalytics(r.data); } catch {}
  };
  useEffect(() => {
    fetchProjects(); fetchAnalytics();
    const iv = setInterval(() => { fetchProjects(); fetchAnalytics(); }, 30000);
    return () => clearInterval(iv);
  }, []);

  // Auth
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const r = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
      setToken(r.data.token);
      localStorage.setItem('adminToken', r.data.token);
      setShowLogin(false);
      setShowAdminPanel(true);
    } catch { alert('Invalid credentials'); }
  };
  const handleLogout = () => {
    setToken(null); localStorage.removeItem('adminToken'); setShowAdminPanel(false);
  };

  // Map init (dark tiles)
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance.current) return;
    mapInstance.current = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([20.5937, 78.9629], 5);
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 })
      .addTo(mapInstance.current);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [leafletLoaded]);

  // Resize map when panel opens/closes
  useEffect(() => {
    if (mapInstance.current) setTimeout(() => mapInstance.current?.invalidateSize(), 300);
  }, [activeProject]);

  // Map markers
  useEffect(() => {
    if (!leafletLoaded || !mapInstance.current) return;
    const filtered = activeFilter === 'All' ? projects : projects.filter(p => p.category === activeFilter);

    Object.keys(markersRef.current).forEach(id => {
      if (!filtered.find(p => p._id === id)) {
        mapInstance.current.removeLayer(markersRef.current[id]);
        mapInstance.current.removeLayer(circlesRef.current[id]);
        delete markersRef.current[id]; delete circlesRef.current[id];
      }
    });

    filtered.forEach(proj => {
      const cat = categoryColors[proj.category] || categoryColors.Road;
      if (!markersRef.current[proj._id]) {
        const isActive = activeProject?._id === proj._id;
        const icon = window.L.divIcon({
          className: '',
          html: `<div style="width:${isActive ? 16 : 12}px;height:${isActive ? 16 : 12}px;background:${cat.dot};border:2px solid white;border-radius:50%;box-shadow:0 0 ${isActive ? 12 : 6}px ${cat.dot}aa;transition:all .2s"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8]
        });
        const marker = window.L.marker([proj.lat, proj.lng], { icon }).addTo(mapInstance.current);
        marker.on('click', () => { setActiveProject(proj); mapInstance.current.flyTo([proj.lat, proj.lng], 13); });
        markersRef.current[proj._id] = marker;
        const circle = window.L.circle([proj.lat, proj.lng], {
          radius: proj.radius, color: cat.dot, fillColor: cat.dot, fillOpacity: 0.08, weight: 1.5
        }).addTo(mapInstance.current);
        circlesRef.current[proj._id] = circle;
      }
    });

    // User dot
    if (userLocation) {
      if (!userMarkerRef.current) {
        const icon = window.L.divIcon({
          className: '',
          html: `<div style="position:relative;width:20px;height:20px">
            <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;opacity:0.3;animation:ping 1.5s infinite"></div>
            <div style="position:absolute;inset:3px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #3b82f688"></div>
          </div>`,
          iconSize: [20, 20], iconAnchor: [10, 10]
        });
        userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon }).addTo(mapInstance.current);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }
  }, [projects, userLocation, leafletLoaded, activeFilter, activeProject?._id]);

  // Geolocation watch + geofencing
  useEffect(() => {
    if (!navigator.geolocation) { setLocError(true); return; }
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        projects.forEach(project => {
          const dist = haversineDistance(latitude, longitude, project.lat, project.lng);
          if (dist <= project.radius) triggerGeofence(project);
        });
      },
      () => setLocError(true),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [projects]);

  const triggerGeofence = async (project) => {
    const key = `notify_${project._id}`;
    const last = localStorage.getItem(key);
    const now = Date.now();
    if (last && now - last < 300000) return; // 5 min cooldown
    localStorage.setItem(key, now.toString());
    setGeofenceAlert(project);
    try { await api.post('/analytics/trigger'); fetchAnalytics(); } catch {}
  };

  // Reviews
  const submitReview = async () => {
    if (!rating && !feedback.trim()) return;
    try {
      if (rating) await api.post(`/projects/${activeProject._id}/rate`, { value: rating });
      if (feedback.trim()) await api.post(`/projects/${activeProject._id}/feedback`, { text: feedback.trim() });
      setRatingSubmitted(true); setFeedback(''); fetchProjects();
    } catch {}
  };
  useEffect(() => { setRating(0); setHoverRating(0); setRatingSubmitted(false); setFeedback(''); }, [activeProject?._id]);

  // CRUD
  const resetForm = () => setFormData({ name: '', description: '', budget: '', timeline: '', status: 'Ongoing', civicImpact: '', radius: 500, lat: userLocation?.lat || 20.5937, lng: userLocation?.lng || 78.9629, mediaUrl: '', category: 'Road' });
  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) await api.put(`/projects/${editingProject._id}`, formData);
      else await api.post('/projects', formData);
      setIsFormOpen(false); setEditingProject(null); resetForm(); fetchProjects();
    } catch {}
  };
  const deleteProject = async (id) => {
    if (window.confirm('Remove this project?')) {
      try { await api.delete(`/projects/${id}`); fetchProjects(); if (activeProject?._id === id) setActiveProject(null); } catch {}
    }
  };

  const scrollToMap = () => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  const filteredProjects = activeFilter === 'All' ? projects : projects.filter(p => p.category === activeFilter);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans" style={{ background: '#050b1a', color: '#f1f5f9' }}>

      {/* ── GEOFENCE ALERT POPUP ── */}
      {geofenceAlert && (
        <GeofencePopup
          project={geofenceAlert}
          onClose={() => setGeofenceAlert(null)}
          onViewDetails={(proj) => { setActiveProject(proj); scrollToMap(); }}
        />
      )}

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: navScrolled ? 'rgba(5,11,26,0.95)' : 'transparent',
          backdropFilter: navScrolled ? 'blur(20px)' : 'none',
          borderBottom: navScrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f6' }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-lg leading-none">CivicPulse</div>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#3b82f6' }}>Civic Transparency</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {[['#problem','Problem'],['#solution','Solution'],['#features','Features'],['#map','Live Map'],['#impact','Impact']].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
            ))}
            {token ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAdminPanel(true)} className="font-bold hover:text-white transition-colors" style={{ color: '#f59e0b' }}>Admin</button>
                <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="font-bold hover:text-white transition-colors" style={{ color: '#f59e0b' }}>Admin</button>
            )}
          </div>
          <button onClick={() => setShowLogin(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#3b82f6' }}>
            Request Demo
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden" style={{ paddingTop: 80 }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.07) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold mb-8"
            style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#34d399', background: 'rgba(16,185,129,0.06)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Civic-Tech Innovation · Digital India
          </div>
          <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6">
            <span className="text-white">See Development </span><span style={{ color: '#3b82f6' }}>Around</span>
            <br /><span className="text-white">You — In </span><span style={{ color: '#f59e0b' }}>Real Time</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Step inside a geo-fenced zone near a hospital, bridge, or metro project and instantly know what's being built, how much is spent, and why it matters to you.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={scrollToMap}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
              style={{ background: '#3b82f6', boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
              <Navigation className="w-4 h-4" /> Explore Live Map
            </button>
            <a href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm border transition-all hover:border-white/30 text-slate-300 hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}>
              Learn More <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          {locError && (
            <p className="mt-4 text-xs text-amber-400 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Location access denied — geo-fencing alerts require location permission.
            </p>
          )}
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="border-y py-6" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-0">
          {[
            { v: `${projects.length}+`, l: 'Zones Mapped', c: '#3b82f6' },
            { v: `${analytics.alertsTriggered}`, l: 'Alerts Triggered', c: '#10b981' },
            { v: '98%', l: 'Accuracy Rate', c: '#f59e0b' },
          ].map(({ v, l, c }, i) => (
            <React.Fragment key={l}>
              {i > 0 && <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.08)' }} />}
              <div className="text-center px-10">
                <div className="text-4xl font-black mb-1" style={{ color: c }}>{v}</div>
                <div className="text-slate-400 text-sm">{l}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section id="problem" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionBadge color="green">The Problem</SectionBadge>
            <h2 className="text-5xl font-black mt-6 mb-4">
              <span className="text-white">The Transparency Gap </span><span style={{ color: '#3b82f6' }}>in Public Works</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">India invests massively in public infrastructure, yet the people it serves are often the last to know.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Eye, title: 'Invisible Infrastructure', stat: '70%', desc: 'Citizens unaware of local development projects in their own neighbourhoods.', color: '#3b82f6' },
              { icon: Database, title: 'Budget Black Box', stat: '₹8L Cr+', desc: 'Annual public infrastructure spend with poor visibility into fund allocation.', color: '#f59e0b' },
              { icon: Users, title: 'Disconnected Citizens', stat: '3 in 5', desc: 'Citizens feel disconnected from governance decisions affecting their daily lives.', color: '#ef4444' },
            ].map(({ icon: Icon, title, stat, desc, color }) => (
              <div key={title} className="rounded-2xl p-8 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${color}18` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div className="text-4xl font-black mb-2" style={{ color }}>{stat}</div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION ── */}
      <section id="solution" className="py-28 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionBadge color="blue">The Solution</SectionBadge>
            <h2 className="text-5xl font-black mt-6 mb-4">
              <span className="text-white">How </span><span style={{ color: '#3b82f6' }}>Geo-Fencing</span><span className="text-white"> Works</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <StepCard num="1" icon={MapPin} title="Enter the Zone" desc="A citizen walks near a defined geo-zone — hospital, bridge, road, or construction site." />
            <StepCard num="2" icon={Navigation} title="System Detects Location" desc="The geo-engine instantly detects the user's proximity to registered civic projects via GPS." />
            <StepCard num="3" icon={Bell} title="Alert Popup Appears" desc="A rich, targeted popup is shown on the citizen's screen with real-time project information." />
            <StepCard num="4" icon={Eye} title="View Project Details" desc="Citizens explore a full transparency report — budget, timeline, completion %, and civic impact." />
          </div>
          <div className="rounded-2xl p-8 border grid md:grid-cols-2 gap-8 items-center"
            style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.15)' }}>
            <div>
              <h3 className="text-2xl font-black text-white mb-3">Powered by <span style={{ color: '#3b82f6' }}>Precision Geo-Fencing</span></h3>
              <p className="text-slate-400 mb-5 leading-relaxed">An invisible digital boundary around a real-world location. When a user's device enters this boundary, the system triggers a contextual popup — no searching required.</p>
              <ul className="space-y-2.5">
                {['Radius customizable from 50m to 5km per zone','Works via browser geolocation API','Privacy-first: no data stored after exit','Near real-time (<500ms) trigger latency'].map(t => (
                  <li key={t} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#3b82f6' }} />{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full border-2 animate-ping opacity-20" style={{ borderColor: '#3b82f6' }} />
                <div className="absolute inset-4 rounded-full border-2 opacity-40" style={{ borderColor: '#3b82f6' }} />
                <div className="absolute inset-10 rounded-full border-2 opacity-60" style={{ borderColor: '#3b82f6' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)' }}>
                    <Shield className="w-8 h-8" style={{ color: '#3b82f6' }} />
                  </div>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap" style={{ color: '#f59e0b' }}>Geo-Fenced Zone</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionBadge color="purple">Key Features</SectionBadge>
            <h2 className="text-5xl font-black mt-6 mb-4">
              <span className="text-white">Everything You Need </span><span style={{ color: '#3b82f6' }}>for Civic </span><span style={{ color: '#f59e0b' }}>Transparency</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={Shield} title="Geo-Fencing Technology" badge="Core" badgeColor="#10b981" iconBg="rgba(16,185,129,0.12)" desc="Define precise digital boundaries around any civic project. Automatically trigger alerts when users enter the zone." />
            <FeatureCard icon={Bell} title="Smart Alert Popups" badge="Engagement" badgeColor="#f59e0b" iconBg="rgba(245,158,11,0.12)" desc="Rich popup notifications with project title, budget, status, and civic impact — shown the moment you enter a zone." />
            <FeatureCard icon={Activity} title="Real-Time Data Updates" badge="Transparency" badgeColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" desc="Live sync with project data to show accurate, up-to-date information — no stale data, no confusion." />
            <FeatureCard icon={BarChart3} title="Project Dashboard" badge="Accessibility" badgeColor="#a78bfa" iconBg="rgba(167,139,250,0.12)" desc="Full breakdown of every project: funding, contractor details, completion %, and public benefit reports." />
            <FeatureCard icon={Smartphone} title="Mobile Integration" badge="Accessibility" badgeColor="#f87171" iconBg="rgba(248,113,113,0.12)" desc="Native browser geolocation support with seamless background tracking and adaptive UI." />
            <FeatureCard icon={Globe} title="Multi-location Scalability" badge="Scale" badgeColor="#34d399" iconBg="rgba(52,211,153,0.12)" desc="Deploy across hundreds of zones simultaneously — from a single ward to a national smart city rollout." />
          </div>
        </div>
      </section>

      {/* ── IMPACT ── */}
      <section id="impact" className="py-28 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionBadge color="orange">Civic Impact</SectionBadge>
            <h2 className="text-5xl font-black mt-6 mb-4">
              <span className="text-white">Numbers That </span><span style={{ color: '#f59e0b' }}>Tell the Story</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
            {[['70%','Citizens unaware of local development','#f59e0b'],['2.1M+','Citizens targeted to join rollout','#3b82f6'],['89%','User satisfaction in awareness surveys','#10b981'],['3x','Increase in civic participation','#a78bfa']].map(([v, l, c]) => (
              <div key={l} className="text-center p-6">
                <div className="text-5xl font-black mb-2" style={{ color: c }}>{v}</div>
                <p className="text-slate-400 text-sm">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Shield, title: 'Builds Trust', desc: 'Transparent data builds lasting trust between citizens and government.', color: '#3b82f6' },
              { icon: TrendingUp, title: 'Promotes Accountability', desc: 'Real-time tracking incentivizes officials to deliver on time and within budget.', color: '#f59e0b' },
              { icon: Users, title: 'Encourages Participation', desc: 'Informed citizens attend hearings, submit feedback, and engage civically.', color: '#10b981' },
              { icon: Globe, title: 'Supports Digital India', desc: 'Aligned with Jan Bhagidari, Smart Cities Mission, and e-Governance mandates.', color: '#a78bfa' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl p-6 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h4 className="text-white font-bold mb-2">{title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE MAP + PANEL ── */}
      <section id="map" ref={mapSectionRef} className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <SectionBadge color="blue">Live Interactive Map</SectionBadge>
            <h2 className="text-5xl font-black mt-6 mb-4">
              <span className="text-white">Ongoing </span><span style={{ color: '#f59e0b' }}>Constructions</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Click any pin to view project details. {userLocation ? '📍 Your location is being tracked for geo-fencing alerts.' : 'Allow location access to receive geo-fencing alerts when you enter a zone.'}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
            {['All', 'Hospital', 'Road', 'Bridge', 'College'].map(cat => {
              const c = cat === 'All' ? '#3b82f6' : (categoryColors[cat]?.dot || '#3b82f6');
              const active = activeFilter === cat;
              return (
                <button key={cat} onClick={() => setActiveFilter(cat)}
                  className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: active ? c : 'rgba(255,255,255,0.04)', color: active ? 'white' : '#94a3b8', border: `1px solid ${active ? c : 'rgba(255,255,255,0.08)'}` }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* MAP LEFT + DETAIL RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ height: 520 }}>
            {/* Left — square map */}
            <div className="rounded-2xl overflow-hidden border relative" style={{ borderColor: 'rgba(255,255,255,0.08)', height: 520 }}>
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
              {/* Location badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold z-[400]"
                style={{ background: 'rgba(13,21,38,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className={`w-2 h-2 rounded-full ${userLocation ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-slate-300">{userLocation ? 'GPS Active' : 'GPS Inactive'}</span>
              </div>
              {/* Click hint */}
              {!activeProject && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 z-[400] pointer-events-none"
                  style={{ background: 'rgba(13,21,38,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Click a pin to see details →
                </div>
              )}
            </div>

            {/* Right — project detail panel */}
            <div className="rounded-2xl border overflow-hidden flex flex-col" style={{ background: '#0a0f1e', borderColor: 'rgba(255,255,255,0.08)', height: 520 }}>
              {activeProject ? (
                <ProjectDetailPanel
                  project={projects.find(p => p._id === activeProject._id) || activeProject}
                  onClose={() => setActiveProject(null)}
                  rating={rating} hoverRating={hoverRating}
                  setRating={setRating} setHoverRating={setHoverRating}
                  ratingSubmitted={ratingSubmitted}
                  feedback={feedback} setFeedback={setFeedback}
                  onSubmitReview={submitReview}
                />
              ) : (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <h3 className="text-white font-bold text-base">All Projects</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{filteredProjects.length} zones mapped</p>
                  </div>
                  {/* Project list */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <Building2 className="w-10 h-10 mb-3 opacity-20 text-white" />
                        <p className="text-slate-500 text-sm">No projects yet.<br />Admin can add via the panel.</p>
                      </div>
                    ) : filteredProjects.map(proj => {
                      const cat = categoryColors[proj.category] || categoryColors.Road;
                      return (
                        <button key={proj._id}
                          onClick={() => { setActiveProject(proj); mapInstance.current?.flyTo([proj.lat, proj.lng], 13); }}
                          className="w-full text-left rounded-xl p-4 border transition-all hover:border-blue-500/30 hover:-translate-y-0.5"
                          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.text }}>
                              {proj.category}
                            </span>
                            <span className={`text-[10px] font-bold ${proj.status === 'Completed' ? 'text-emerald-400' : proj.status === 'Ongoing' ? 'text-blue-400' : 'text-slate-500'}`}>
                              {proj.status}
                            </span>
                          </div>
                          <div className="text-white font-bold text-sm leading-tight">{proj.name}</div>
                          <div className="text-slate-500 text-xs mt-1 line-clamp-1">{proj.description}</div>
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{proj.radius}m</span>
                            <span className="flex items-center gap-1 text-yellow-500">★ {proj.avgRating || 0}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-5 flex-wrap">
            {Object.entries(categoryColors).map(([cat, c]) => (
              <div key={cat} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />{cat}
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />Your Location
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3b82f6' }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm">CivicPulse</div>
              <div className="text-slate-500 text-xs">Civic Transparency Platform</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${userLocation ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {userLocation ? 'GPS Active' : 'GPS Inactive'}
            </span>
            <span>{projects.length} Active Zones</span>
            <span>{analytics.alertsTriggered} Alerts Triggered</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 CivicPulse · Built for Digital India</p>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-3xl p-10 border" style={{ background: '#0d1526', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Secure Access</h2>
              <p className="text-slate-400 text-sm mt-1">Enter admin credentials to continue</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input className="w-full px-5 py-4 rounded-xl text-white placeholder-slate-600 outline-none font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="Username" onChange={e => setLoginData({ ...loginData, username: e.target.value })} />
              <input type="password" className="w-full px-5 py-4 rounded-xl text-white placeholder-slate-600 outline-none font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="Password" onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
              <button type="submit" className="w-full py-4 rounded-xl font-black text-white" style={{ background: '#3b82f6' }}>Sign In</button>
              <button type="button" onClick={() => setShowLogin(false)} className="w-full text-slate-500 py-2 text-sm hover:text-slate-300">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* ── ADMIN PANEL ── */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAdminPanel(false)} />
          <div className="relative w-full max-w-2xl h-full flex flex-col shadow-2xl border-l" style={{ background: '#0a0f1e', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="p-8 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <h2 className="text-2xl font-black text-white">Geo-Manager</h2>
                <p className="text-slate-500 text-sm">{projects.length} zones · Manage deployments</p>
              </div>
              <button onClick={() => { setEditingProject(null); resetForm(); setIsFormOpen(true); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white" style={{ background: '#3b82f6' }}>
                <Plus className="w-4 h-4" /> Create Site
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {projects.map(proj => {
                const cat = categoryColors[proj.category] || categoryColors.Road;
                return (
                  <div key={proj._id} className="rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.text }}>{proj.category}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{proj.status}</span>
                        </div>
                        <h3 className="text-white font-bold truncate">{proj.name}</h3>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{proj.radius}m</span>
                          <span>{proj.budget || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3 flex-shrink-0">
                        <button onClick={() => { setEditingProject(proj); setFormData({ ...proj }); setIsFormOpen(true); }}
                          className="p-2 rounded-xl text-slate-500 hover:text-blue-400" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteProject(proj._id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECT FORM ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl" style={{ background: '#0d1526', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="p-7 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="text-xl font-black text-white">{editingProject ? 'Update' : 'Create'} Site Deployment</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveProject} className="p-7 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[65vh]">
              {[
                { label: 'Project Name', key: 'name', col: 'md:col-span-2' },
                { label: 'Description', key: 'description', col: 'md:col-span-2', textarea: true },
                { label: 'Budget', key: 'budget' }, { label: 'Timeline', key: 'timeline' },
                { label: 'Civic Impact', key: 'civicImpact', col: 'md:col-span-2', textarea: true },
                { label: 'Latitude', key: 'lat', type: 'number' }, { label: 'Longitude', key: 'lng', type: 'number' },
                { label: 'Radius (m)', key: 'radius', type: 'number' }, { label: 'Media URL', key: 'mediaUrl' },
              ].map(({ label, key, col, textarea, type = 'text' }) => (
                <div key={key} className={`space-y-1 ${col || ''}`}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
                  {textarea
                    ? <textarea rows="2" value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    : <input type={type} step={type === 'number' ? 'any' : undefined}
                        required={['name','description','civicImpact','lat','lng'].includes(key)}
                        value={formData[key] || ''} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  }
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option>Ongoing</option><option>Completed</option><option>Planned</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option>Hospital</option><option>Road</option><option>Bridge</option><option>College</option>
                </select>
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full py-4 rounded-xl font-black text-white" style={{ background: '#3b82f6' }}>
                  {editingProject ? 'Update Site' : 'Activate Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
