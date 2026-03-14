import React, { useState, useEffect } from 'react';
import './DraftsPanel.css';

const DraftsPanel = ({ token, apiBaseUrl }) => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDrafts();
    }, []);

    const fetchDrafts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/admin/products?status=draft&limit=50`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDrafts(data.data.filter(p => p.status === 'draft'));
            } else {
                setError('Failed to fetch drafts');
            }
        } catch (error) {
            setError('Error fetching drafts: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (draftId) => {
        try {
            const response = await fetch(`${apiBaseUrl}/admin/drafts/${draftId}/publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setError(null);
                fetchDrafts();
            } else {
                setError('Failed to publish draft');
            }
        } catch (error) {
            setError('Error publishing draft: ' + error.message);
        }
    };

    return (
        <div className="drafts-panel">
            <div className="panel-header">
                <h3>Draft Management</h3>
                <p>Review and publish draft entries</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading drafts...</p>
                </div>
            ) : drafts && drafts.length > 0 ? (
                <div className="drafts-list">
                    {drafts.map(draft => (
                        <div key={draft.product_id} className="draft-card">
                            <div className="draft-header">
                                <h4>{draft.name}</h4>
                                <span className="draft-badge">📄 DRAFT</span>
                            </div>
                            <div className="draft-meta">
                                <span>Company: {draft.company_name || 'N/A'}</span>
                                <span>Category: {draft.subcategory_name || 'Uncategorized'}</span>
                                <span>Updated: {new Date(draft.updated_at).toLocaleString()}</span>
                            </div>
                            {draft.description && (
                                <p className="draft-description">{draft.description}</p>
                            )}
                            <div className="draft-actions">
                                <button 
                                    className="btn-publish"
                                    onClick={() => handlePublish(draft.product_id)}
                                >
                                    📤 Publish
                                </button>
                                <button 
                                    className="btn-preview"
                                    onClick={() => console.log('Preview:', draft)}
                                >
                                    👁️ Preview
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>No draft entries. All products are published.</p>
                </div>
            )}

            {drafts.length > 0 && (
                <div className="drafts-footer">
                    <p>Total Drafts: {drafts.length}</p>
                </div>
            )}
        </div>
    );
};

export default DraftsPanel;
