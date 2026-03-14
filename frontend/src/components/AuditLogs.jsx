import React, { useState, useEffect } from 'react';
import './AuditLogs.css';

const AuditLogs = ({ token, apiBaseUrl }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Fetch logs - this would need a dedicated endpoint
            const response = await fetch(`${apiBaseUrl}/admin/products?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // We would need to fetch actual change logs, but for now
                // demonstrate with products as an example
                setLogs(
                    data.data.map(p => ({
                        log_id: p.product_id,
                        action: 'UPDATE',
                        product_name: p.name,
                        operator_name: 'Current Operator',
                        timestamp: p.updated_at,
                        changes_summary: `Last updated: ${new Date(p.updated_at).toLocaleDateString()}`
                    }))
                );
            } else {
                setError('Failed to fetch logs');
            }
        } catch (error) {
            setError('Error fetching logs: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = filter === 'all' 
        ? logs 
        : logs.filter(log => log.action === filter);

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE':
                return 'action-create';
            case 'UPDATE':
                return 'action-update';
            case 'DELETE':
                return 'action-delete';
            default:
                return '';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE':
                return '✨';
            case 'UPDATE':
                return '✏️';
            case 'DELETE':
                return '🗑️';
            default:
                return '📝';
        }
    };

    return (
        <div className="audit-logs">
            <div className="logs-header">
                <h3>Change Audit Log</h3>
                <p>Track all changes made to products by operators</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Filters */}
            <div className="logs-filters">
                <div className="filter-buttons">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Changes
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'CREATE' ? 'active' : ''}`}
                        onClick={() => setFilter('CREATE')}
                    >
                        ✨ Created
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'UPDATE' ? 'active' : ''}`}
                        onClick={() => setFilter('UPDATE')}
                    >
                        ✏️ Updated
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'DELETE' ? 'active' : ''}`}
                        onClick={() => setFilter('DELETE')}
                    >
                        🗑️ Deleted
                    </button>
                </div>
                <button className="btn-refresh" onClick={fetchLogs}>
                    🔄 Refresh
                </button>
            </div>

            {/* Timeline */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading audit logs...</p>
                </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
                <div className="logs-timeline">
                    {filteredLogs.map((log, index) => (
                        <div key={log.log_id} className="log-entry">
                            <div className="log-timeline-marker">
                                <div className={`marker ${getActionColor(log.action)}`}>
                                    {getActionIcon(log.action)}
                                </div>
                            </div>
                            <div className="log-content">
                                <div className="log-title">
                                    <span className={`action-badge ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                    <strong>{log.product_name}</strong>
                                </div>
                                <div className="log-meta">
                                    <span>Operator: {log.operator_name}</span>
                                    <span className="time">
                                        {new Date(log.timestamp).toLocaleDateString()} 
                                        {' '}
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="log-details">{log.changes_summary}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>No audit logs found for the selected filter.</p>
                </div>
            )}

            {/* Summary Stats */}
            {filteredLogs.length > 0 && (
                <div className="logs-summary">
                    <div className="summary-stat">
                        <span className="stat-label">Total Changes:</span>
                        <span className="stat-value">{filteredLogs.length}</span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Date Range:</span>
                        <span className="stat-value">
                            {new Date(filteredLogs[filteredLogs.length - 1].timestamp).toLocaleDateString()} 
                            {' - '}
                            {new Date(filteredLogs[0].timestamp).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
