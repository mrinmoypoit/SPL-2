import React, { useState } from 'react';
import './AuditLogs.css';

const AuditLogs = ({ logs, loading, onFilterChange, filter }) => {
    const [localFilter, setLocalFilter] = useState(filter || 'all');

    const handleFilterChange = (action) => {
        setLocalFilter(action);
        onFilterChange(action);
    };

    const filteredLogs = localFilter === 'all' 
        ? logs 
        : logs.filter(log => log.action === localFilter);

    const getActionIcon = (action) => {
        switch(action) {
            case 'CREATE': return '➕';
            case 'UPDATE': return '✏️';
            case 'DELETE': return '🗑️';
            case 'PUBLISH': return '📤';
            case 'DRAFT': return '📄';
            default: return '•';
        }
    };

    const getActionColor = (action) => {
        switch(action) {
            case 'CREATE': return 'create';
            case 'UPDATE': return 'update';
            case 'DELETE': return 'delete';
            case 'PUBLISH': return 'publish';
            case 'DRAFT': return 'draft';
            default: return 'default';
        }
    };

    return (
        <div className="audit-logs-container">
            <div className="logs-header">
                <h3>📋 Change History & Audit Logs</h3>
                <p>Track all modifications to products and system data</p>
            </div>

            {/* Action Filter */}
            <div className="action-filter">
                <button
                    className={`filter-btn ${localFilter === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('all')}
                >
                    All Actions
                </button>
                <button
                    className={`filter-btn ${localFilter === 'CREATE' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('CREATE')}
                >
                    ➕ Created
                </button>
                <button
                    className={`filter-btn ${localFilter === 'UPDATE' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('UPDATE')}
                >
                    ✏️ Updated
                </button>
                <button
                    className={`filter-btn ${localFilter === 'DELETE' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('DELETE')}
                >
                    🗑️ Deleted
                </button>
                <button
                    className={`filter-btn ${localFilter === 'PUBLISH' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('PUBLISH')}
                >
                    📤 Published
                </button>
            </div>

            {/* Logs Timeline */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading audit logs...</p>
                </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
                <div className="timeline">
                    {filteredLogs.map((log, index) => (
                        <div key={log.log_id || index} className={`timeline-item log-${getActionColor(log.action)}`}>
                            <div className="timeline-marker">
                                <span className="action-icon">{getActionIcon(log.action)}</span>
                            </div>
                            
                            <div className="timeline-content">
                                <div className="log-header">
                                    <span className={`action-badge action-${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                    <span className="timestamp">
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>

                                <div className="log-body">
                                    <p className="log-message">
                                        <strong>Product:</strong> {log.product_name || 'N/A'}
                                    </p>
                                    {log.performed_by && (
                                        <p className="log-message">
                                            <strong>By:</strong> {log.performed_by}
                                        </p>
                                    )}
                                    {log.description && (
                                        <p className="log-message">
                                            <strong>Details:</strong> {log.description}
                                        </p>
                                    )}
                                </div>

                                {log.changes && Object.keys(log.changes).length > 0 && (
                                    <div className="changes-summary">
                                        <strong>Changes:</strong>
                                        <ul>
                                            {Object.entries(log.changes).map(([field, value]) => (
                                                <li key={field}>
                                                    <span className="field-name">{field}:</span> 
                                                    <span className="field-value">{String(value).substring(0, 50)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>📭 No audit logs found for the selected filter</p>
                </div>
            )}

            {/* Statistics */}
            {logs && logs.length > 0 && (
                <div className="logs-statistics">
                    <div className="stat-box">
                        <span className="stat-label">Total Actions:</span>
                        <span className="stat-value">{logs.length}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Creates:</span>
                        <span className="stat-value">{logs.filter(l => l.action === 'CREATE').length}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Updates:</span>
                        <span className="stat-value">{logs.filter(l => l.action === 'UPDATE').length}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Deletes:</span>
                        <span className="stat-value">{logs.filter(l => l.action === 'DELETE').length}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
