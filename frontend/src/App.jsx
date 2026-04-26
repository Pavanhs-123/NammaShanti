import React, { useState } from 'react';
import { FiAlertCircle, FiMapPin, FiVolume2, FiShield, FiCheckCircle } from 'react-icons/fi';
import { mockIncidents } from './data/mockData';
import MapWidget from './components/MapWidget';
import { db, collection, onSnapshot, query, orderBy, isFirebaseConfigured, doc, updateDoc } from './services/firebase';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  React.useEffect(() => {
    if (!isFirebaseConfigured) {
      setIncidents(mockIncidents);
      return;
    }

    const q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = [];
      snapshot.forEach((doc) => {
        liveData.push({ id: doc.id, ...doc.data() });
      });
      setIncidents(liveData.length > 0 ? liveData : mockIncidents);
    }, (error) => {
      console.error("Firebase listen error:", error);
      setIncidents(mockIncidents);
    });

    return () => unsubscribe();
  }, []);

  // Approve and Update Firestore
  const handleApprove = async () => {
    if (!selectedIncident) return;
    setIsBroadcasting(true);
    
    if (isFirebaseConfigured && selectedIncident.id && !selectedIncident.id.startsWith("inc_")) {
      try {
        const incidentRef = doc(db, 'incidents', selectedIncident.id);
        await updateDoc(incidentRef, {
          status: 'approved'
        });
      } catch (err) {
        console.error("Failed to approve:", err);
      }
    }
    
    setTimeout(() => { setIsBroadcasting(false); }, 1000);
  };

  const handleMassBroadcast = async () => {
    if (!selectedIncident) return;
    setIsBroadcasting(true);
    
    if (isFirebaseConfigured && selectedIncident.id && !selectedIncident.id.startsWith("inc_")) {
      try {
        const incidentRef = doc(db, 'incidents', selectedIncident.id);
        await updateDoc(incidentRef, {
          status: 'approved',
          mass_broadcast: true,
          mass_broadcasted: false
        });
      } catch (err) {
        console.error("Failed to mass broadcast:", err);
      }
    }
    
    setTimeout(() => { setIsBroadcasting(false); }, 1000);
  };

  const handleStatusToggle = async (newStatus) => {
    if (!selectedIncident) return;
    // Optimistically update UI immediately
    setSelectedIncident(prev => ({ ...prev, status: newStatus }));
    if (isFirebaseConfigured && selectedIncident.id && !selectedIncident.id.startsWith("inc_")) {
      try {
        const incidentRef = doc(db, 'incidents', selectedIncident.id);
        await updateDoc(incidentRef, { status: newStatus });
      } catch (err) {
        console.error("Failed to update status:", err);
        // Revert on failure
        setSelectedIncident(prev => ({ ...prev, status: selectedIncident.status }));
      }
    }
  };

  const getThreatLabel = (score) => {
    if (score >= 8) return { label: 'HIGH', className: 'high' };
    if (score >= 5) return { label: 'MED', className: 'med' };
    return { label: 'LOW', className: 'low' };
  };

  const filteredIncidents = incidents.filter(inc => {
    if (filterStatus === 'PENDING') return inc.status !== 'approved';
    if (filterStatus === 'RESOLVED') return inc.status === 'approved';
    if (filterStatus === 'URGENT') return (inc.panic_index || inc.threat_score) >= 5;
    return true;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <FiShield /> NammaShanti Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Live Monitoring: <strong style={{color: 'var(--text-primary)'}}>Bengaluru City</strong>
          </span>
          <div className="pulse-indicator"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Left Panel: Feed */}
        <aside className="incident-feed">
          <div className="feed-title">
            <span style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Reports
              <span style={{background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '12px', fontSize: '0.75rem'}}>
                {filteredIncidents.length}
              </span>
            </span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '3px 6px', fontSize: '0.72rem', cursor: 'pointer', outline: 'none', flexShrink: 0 }}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="URGENT">Urgent (≥5)</option>
            </select>
          </div>
          
          <div className="feed-scroll">
          {filteredIncidents.map((inc) => {
            const threat = getThreatLabel(inc.panic_index || inc.threat_score);
            return (
              <div 
                key={inc.id}
                className={`incident-card threat-${threat.className} ${selectedIncident?.id === inc.id ? 'active' : ''}`}
                onClick={() => setSelectedIncident(inc)}
              >
                <div className="card-header">
                  <span className="location-tag">
                    <FiMapPin /> {inc.location?.area_name || "Unknown"}
                  </span>
                  <span className={`threat-badge ${threat.className}`}>
                    {threat.label} {(inc.panic_index || inc.threat_score)}/10
                  </span>
                </div>
                <div className="card-text">
                  "{inc.original_text}"
                </div>
                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(inc.timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
          </div>
        </aside>

        {/* Center: Map */}
        <div className="map-container">
          <MapWidget 
            incidents={filteredIncidents} 
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
          />
        </div>

        {/* Right Panel: Response Workflow */}
        {selectedIncident && (
          <aside className="response-panel">
            <div className="panel-title">
              <FiAlertCircle style={{ color: (selectedIncident.panic_index || selectedIncident.threat_score) >= 8 ? 'var(--accent-red)' : 'var(--accent-orange)' }}/>
              Panic Index Analysis
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: selectedIncident.status === 'approved' ? '#10b981' : selectedIncident.status === 'resolved' ? '#6ee7b7' : '#f59e0b' }}>
                    {selectedIncident.status === 'approved' ? '✅ APPROVED' : selectedIncident.status === 'resolved' ? '🟢 RESOLVED' : '⏳ PENDING'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => handleStatusToggle('pending')} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #f59e0b', background: selectedIncident.status === 'pending' ? '#f59e0b' : 'transparent', color: selectedIncident.status === 'pending' ? '#000' : '#f59e0b', cursor: 'pointer' }}>Pending</button>
                    <button onClick={() => handleStatusToggle('approved')} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #10b981', background: selectedIncident.status === 'approved' ? '#10b981' : 'transparent', color: selectedIncident.status === 'approved' ? '#000' : '#10b981', cursor: 'pointer' }}>Approved</button>
                    <button onClick={() => handleStatusToggle('resolved')} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #6ee7b7', background: selectedIncident.status === 'resolved' ? '#6ee7b7' : 'transparent', color: selectedIncident.status === 'resolved' ? '#000' : '#6ee7b7', cursor: 'pointer' }}>Resolved</button>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>VELOCITY</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{selectedIncident.velocity_score || '-'}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', flex: 1, textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>PANIC INDEX</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fca5a5' }}>{selectedIncident.panic_index || selectedIncident.threat_score || '-'}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-label">Original Forwarded Message</div>
              <div className="original-text">"{selectedIncident.original_text}"</div>
            </div>

            <div className="detail-section">
              <div className="section-label">AI Extracted Triggers</div>
              <div className="trigger-tags">
                {(selectedIncident.triggers || []).map((t, i) => (
                  <span key={i} className="tag">{t}</span>
                ))}
              </div>
            </div>

            <div className="panel-title" style={{ marginTop: '1rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
              <FiCheckCircle style={{ color: 'var(--accent-blue)' }}/>
              Draft Response
            </div>

            <div className="draft-box">
              <div className="draft-text">{selectedIncident.draft_response}</div>
              <div style={{position: 'absolute', top: '-10px', right: '15px', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#60a5fa', border: '1px solid #3b82f6'}}>
                ✨ Gemini Draft
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleApprove}
                disabled={isBroadcasting}
                style={{ opacity: isBroadcasting ? 0.7 : 1 }}
              >
                <FiCheckCircle /> {isBroadcasting ? 'Approving...' : 'Approve & Reply to Citizen'}
              </button>

              <button 
                className="btn btn-primary" 
                onClick={handleMassBroadcast}
                disabled={isBroadcasting}
                style={{ opacity: isBroadcasting ? 0.7 : 1, background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
              >
                📢 {isBroadcasting ? 'Broadcasting...' : 'Mass Broadcast Truth (All Citizens)'}
              </button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;
