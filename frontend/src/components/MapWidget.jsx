import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, Circle, InfoWindow } from '@react-google-maps/api';

const libraries = ['places', 'visualization'];
const mapContainerStyle = {
  width: '100%',
  height: '100%'
};
const center = {
  lat: 12.9716, // Bengaluru center
  lng: 77.5946
};

// Dark mode map styles
const options = {
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

// Heatmap layer component using raw Google Maps API
function HeatmapLayer({ map, incidents }) {
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google?.maps?.visualization) return;

    // Build weighted heatmap data from incidents
    const heatmapData = incidents
      .filter(inc => inc.location?.lat && inc.location?.lng)
      .map(inc => ({
        location: new window.google.maps.LatLng(inc.location.lat, inc.location.lng),
        weight: (inc.panic_index || inc.threat_score || 1) * 10, // scale 1-10 → 10-100
      }));

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 60,
      opacity: 0.75,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)',
      ],
    });

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [map, incidents]);

  return null;
}

export default function MapWidget({ incidents, selectedIncident, onSelectIncident }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Generate mock nearby authorities when an incident is selected
  const nearbyAuthorities = useMemo(() => {
    if (!selectedIncident) return [];
    const lat = selectedIncident.location?.lat || 12.9716;
    const lng = selectedIncident.location?.lng || 77.5946;
    return [
      { id: 'unit-1', lat: lat + 0.004, lng: lng + 0.003, name: 'Hoysala Patrol 104', officer: 'Inspector R. Kumar', phone: '+91-9448112345', status: 'Available' },
      { id: 'unit-2', lat: lat - 0.002, lng: lng - 0.005, name: 'KSRP Rapid Response', officer: 'Sub-Insp S. Patil', phone: '+91-9448112346', status: 'En Route' },
      { id: 'unit-3', lat: lat + 0.001, lng: lng - 0.007, name: 'Local Station Unit', officer: 'Constable V. Gowda', phone: '+91-9448112347', status: 'Available' }
    ];
  }, [selectedIncident?.id]);

  if (loadError) return <div className="text-white p-4">Error loading maps</div>;
  if (!isLoaded) return <div className="text-white p-4">Loading maps...</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Heatmap Toggle Button */}
      <button
        onClick={() => setShowHeatmap(prev => !prev)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.82rem',
          fontFamily: 'Outfit, sans-serif',
          transition: 'all 0.25s ease',
          backdropFilter: 'blur(12px)',
          background: showHeatmap
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
            : 'rgba(22, 28, 45, 0.85)',
          color: showHeatmap ? '#fff' : '#94a3b8',
          boxShadow: showHeatmap
            ? '0 0 20px rgba(239,68,68,0.5)'
            : '0 2px 12px rgba(0,0,0,0.4)',
          border: showHeatmap
            ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {showHeatmap ? '🔥 Heatmap ON' : '🗺️ Heatmap OFF'}
      </button>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={11}
        center={center}
        options={options}
        onLoad={map => setMapInstance(map)}
      >
        {/* Live Threat Heatmap Layer */}
        {showHeatmap && mapInstance && (
          <HeatmapLayer map={mapInstance} incidents={incidents} />
        )}

        {/* Incident markers — hide when heatmap is active for cleaner look */}
        {!showHeatmap && incidents.map((incident) => {
          const isSelected = selectedIncident?.id === incident.id;
          const currentScore = incident.panic_index || incident.threat_score;
          const color = currentScore >= 8 ? '#ef4444' :
                        currentScore >= 5 ? '#f59e0b' : '#10b981';

          return (
            <React.Fragment key={incident.id}>
              <Marker
                position={{
                  lat: incident.location?.lat || 12.9716,
                  lng: incident.location?.lng || 77.5946
                }}
                onClick={() => onSelectIncident(incident)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: isSelected ? 18 : 12,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: isSelected ? 4 : 2,
                }}
              />
              {/* Draw a heat radius for high threat */}
              {currentScore >= 8 && (
                <Circle
                  center={{
                    lat: incident.location?.lat || 12.9716,
                    lng: incident.location?.lng || 77.5946
                  }}
                  radius={1200}
                  options={{
                    fillColor: '#ef4444',
                    fillOpacity: 0.2,
                    strokeColor: '#ef4444',
                    strokeOpacity: 0.4,
                    strokeWeight: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Render Nearby Authorities */}
        {nearbyAuthorities.map((unit) => (
          <Marker
            key={unit.id}
            position={{ lat: unit.lat, lng: unit.lng }}
            title={unit.name}
            onClick={() => setSelectedUnit(unit)}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/police.png',
              scaledSize: new window.google.maps.Size(32, 32)
            }}
          />
        ))}

        {/* Info Window for Police Units */}
        {selectedUnit && (
          <InfoWindow
            position={{ lat: selectedUnit.lat, lng: selectedUnit.lng }}
            onCloseClick={() => setSelectedUnit(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
          >
            <div style={{ padding: '8px', color: '#1e293b', minWidth: '150px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e40af' }}>🚓 {selectedUnit.name}</h4>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Officer:</strong> {selectedUnit.officer}</div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Contact:</strong> {selectedUnit.phone}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: selectedUnit.status === 'Available' ? '#10b981' : '#f59e0b' }}>
                {selectedUnit.status}
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                style={{ marginTop: '8px', width: '100%', padding: '4px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Dispatch Unit
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
