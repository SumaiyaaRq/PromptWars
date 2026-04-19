import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://smart-venue-backend-201631981798.us-central1.run.app';

const ZoneCard = ({ zone, onUpdate, isRecommended, isCrowded }) => {
  const { zoneId, currentOccupancy, maxCapacity, densityPercentage, predictedStatus, waitTime } = zone;
  const [sliderValue, setSliderValue] = useState(currentOccupancy);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setSliderValue(currentOccupancy);
  }, [currentOccupancy]);

  const getDensityColor = (percentage) => {
    if (percentage < 50) return 'var(--color-safe)';
    if (percentage <= 80) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getStatusLabel = (percentage) => {
    if (percentage < 50) return { text: 'Low', class: 'safe' };
    if (percentage <= 80) return { text: 'Moderate', class: 'warning' };
    return { text: 'High', class: 'danger' };
  };

  const getTrendIcon = (status) => {
    switch (status) {
      case 'Increasing': return '↑';
      case 'Decreasing': return '↓';
      default: return '→';
    }
  };

  const color = getDensityColor(densityPercentage);
  const statusLabel = getStatusLabel(densityPercentage);
  const trendIcon = getTrendIcon(predictedStatus);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/venues/v-1/zones/${zoneId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentOccupancy: parseInt(sliderValue, 10) })
      });
      if (!response.ok) {
        throw new Error('Update failed');
      }
      setFeedback({ type: 'success', message: 'Updated successfully' });
      if (onUpdate) onUpdate();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Update failed' });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className={`zone-card ${isRecommended ? 'recommended' : ''} ${isCrowded ? 'crowded' : ''}`} style={{ '--density-color': color }}>
      <div className="zone-header">
        <div>
          <h3 className="zone-title">
            {zoneId}
            {predictedStatus && (
              <span className={`trend-indicator ${predictedStatus.toLowerCase()}`} title={predictedStatus}>
                {trendIcon}
              </span>
            )}
          </h3>
          <span className={`status-badge status-${statusLabel.class}`}>{statusLabel.text}</span>
        </div>
        <span className="density-badge" style={{ backgroundColor: color }}>
          {densityPercentage}%
        </span>
      </div>

      <div className="zone-stats">
        <div className="stat">
          <span className="stat-label">Wait Time</span>
          <span className="stat-value" style={{ fontSize: '1.2rem', color }}>{waitTime || '--'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Occupancy</span>
          <span className="stat-value">{currentOccupancy}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Capacity</span>
          <span className="stat-value">{maxCapacity}</span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(densityPercentage, 100)}%`, backgroundColor: color }}
        />
      </div>

      <div className="interaction-section">
        <div className="slider-container">
          <label className="slider-label">Simulate Occupancy: <strong>{sliderValue}</strong></label>
          <input
            type="range"
            min="0"
            max={maxCapacity}
            value={sliderValue}
            onChange={(e) => setSliderValue(e.target.value)}
            className="occupancy-slider"
            disabled={isUpdating}
          />
        </div>
        <div className="action-row">
          <button
            className="update-btn"
            onClick={handleUpdate}
            disabled={isUpdating || parseInt(sliderValue, 10) === currentOccupancy}
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
          {feedback && (
            <span className={`feedback-msg ${feedback.type}`}>
              {feedback.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [zones, setZones] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const fetchData = async () => {
    try {
      const [zonesRes, recRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/venues/v-1/zones`),
        fetch(`${API_BASE_URL}/api/v1/venues/v-1/recommendations`)
      ]);

      if (!zonesRes.ok || !recRes.ok) {
        throw new Error('Failed to fetch venue data');
      }

      const zonesData = await zonesRes.json();
      const recData = await recRes.json();

      setZones(zonesData);
      setRecommendations(recData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup polling for real-time updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      const crowdedIds = new Set(zones.filter(z => z.densityPercentage > 80).map(z => z.zoneId));
      for (let id of newSet) {
        if (!crowdedIds.has(id)) {
          newSet.delete(id);
        }
      }
      return newSet;
    });
  }, [zones]);

  const alerts = zones
    .filter(zone => zone.densityPercentage > 80 && !dismissedAlerts.has(zone.zoneId))
    .map(zone => {
      const altZone = recommendations?.recommendedZones?.[0];
      const altText = altZone ? ` Use ${altZone} instead.` : '';
      return { id: zone.zoneId, text: `⚠️ ${zone.zoneId} is overcrowded.${altText}` };
    });

  const increasingZonesCount = zones.filter(zone => zone.predictedStatus === 'Increasing').length;
  let trendSummary = null;
  if (increasingZonesCount > 0) {
    trendSummary = `Crowd increasing in ${increasingZonesCount} ${increasingZonesCount === 1 ? 'zone' : 'zones'}. Consider alternative areas.`;
  }

  const crowdedCount = zones.filter(zone => zone.densityPercentage > 80).length;
  const safeCount = zones.filter(zone => zone.densityPercentage < 50).length;
  const summaryText = `${crowdedCount} ${crowdedCount === 1 ? 'zone is' : 'zones are'} crowded, ${safeCount} ${safeCount === 1 ? 'zone is' : 'zones are'} safe.`;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>SmartVenue Navigator</h1>
        <p>Real-time crowd monitoring and intelligent decision support</p>
      </header>

      <main className="dashboard-main">
        {loading && <div className="state-message loading">Loading real-time data...</div>}

        {error && (
          <div className="state-message error">
            <span className="error-icon">⚠️</span> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="dashboard-section">
              <h2 className="section-header">Smart Assistant & Alerts</h2>

              {alerts.length > 0 && (
                <div className="alerts-container">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="alert-banner">
                      <span>{alert.text}</span>
                      <button
                        className="dismiss-alert-btn"
                        onClick={() => setDismissedAlerts(prev => new Set(prev).add(alert.id))}
                        aria-label="Dismiss alert"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {trendSummary && (
                <div className="trend-summary-banner">
                  <span className="trend-icon">📈</span> {trendSummary}
                </div>
              )}

              {recommendations && (
                <div className="recommendations-banner">
                  <div className="recommendations-icon">✨</div>
                  <div className="recommendations-content">
                    <h2>Recommendations</h2>
                    <p>{recommendations.summary}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-header-row">
                <h2 className="section-header">Live Crowd Status</h2>
                {zones.length > 0 && (
                  <span className="status-summary-pill">{summaryText}</span>
                )}
              </div>

              {zones.length === 0 ? (
                <div className="state-message empty">No zones available.</div>
              ) : (
                <div className="zones-grid">
                  {zones.map((zone) => (
                    <ZoneCard
                      key={zone.zoneId}
                      zone={zone}
                      onUpdate={fetchData}
                      isRecommended={recommendations?.recommendedZones?.includes(zone.zoneId)}
                      isCrowded={recommendations?.crowdedZones?.includes(zone.zoneId)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
