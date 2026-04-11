import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapPanel = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const center = [31.5, 68.5]; // Adjusted center to show both Balochistan and KPK
  const zoom = 5;

  const riskData = [
    { name: 'Quetta', pos: [30.1798, 66.9750], risk: 'Critical', color: '#EF4444', pulse: '1.2s' },
    { name: 'Kech District', pos: [25.9931, 63.3006], risk: 'High', color: '#F97316', pulse: '2s' },
    { name: 'Zhob', pos: [31.3411, 69.4481], risk: 'High', color: '#F97316', pulse: '2s' },
    { name: 'Pishin', pos: [30.5817, 66.9961], risk: 'Medium', color: '#F59E0B', pulse: '2s' },
    { name: 'Swat', pos: [35.2227, 72.4258], risk: 'Critical', color: '#EF4444', pulse: '1.2s' },
    { name: 'Dir', pos: [35.1977, 71.8749], risk: 'Low', color: '#22C55E', pulse: '3s' },
  ];

  useEffect(() => {
    // Prevent double initialization
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
      doubleClickZoom: false,
      touchZoom: false,
      attributionControl: false,
      backgroundColor: '#080808'
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Add Markers
    riskData.forEach(m => {
      const coreColor = m.risk === 'Critical' ? '#B91C1C' : (m.risk === 'High' ? '#C2410C' : (m.risk === 'Medium' ? '#B45309' : '#15803D'));
      const icon = L.divIcon({
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:36px;height:36px;border-radius:50%;border:4px solid ${m.color};animation:ripple-pulse ${m.pulse} linear infinite;opacity:0;"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${coreColor};border:2px solid ${m.color};box-shadow:0 0 4px ${m.color}88;"></div>
          </div>
        `
      });
      L.marker(m.pos, { icon }).addTo(map);
    });

    const disableDrag = () => { if (map.dragging) map.dragging.disable() };
    const enableDrag = () => { if (map.dragging) map.dragging.enable() };
    const container = map.getContainer();
    container.addEventListener('mouseleave', disableDrag);
    container.addEventListener('mouseenter', enableDrag);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        container.removeEventListener('mouseleave', disableDrag);
        container.removeEventListener('mouseenter', enableDrag);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-panel-container">
      <div className="map-wrapper" style={{ height: '100%', width: '100%', isolation: 'isolate', zIndex: 0, position: 'relative' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', background: '#080808' }}></div>
      </div>

      {/* Overlays */}
      <div className="map-overlay-vignette"></div>
      <div className="map-label-overlay mono">
        LIVE MONITORING &middot; BALOCHISTAN & KPK
      </div>

      <style>{`
        .ripple-marker {
          animation-name: ripple-pulse;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes ripple-pulse {
          0% { transform: scale(0.5); opacity: 0.15; }
          50% { transform: scale(1); opacity: 0; }
          100% { transform: scale(0.5); opacity: 0.15; }
        }

        .map-panel-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #080808;
        }

        .map-overlay-vignette {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, transparent 10%, rgba(8, 8, 8, 0.98) 100%);
          pointer-events: none;
          z-index: 1000;
        }

        .map-label-overlay {
          position: absolute;
          bottom: 24px;
          left: 24px;
          color: #F59E0B;
          font-size: 10px;
          letter-spacing: 0.2em;
          z-index: 1001;
          background: rgba(8, 8, 8, 0.8);
          padding: 6px 12px;
          border-left: 2px solid #F59E0B;
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
};

export default MapPanel;
