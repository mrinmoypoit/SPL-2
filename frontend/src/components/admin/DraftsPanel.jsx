import React from 'react';
import './DraftsPanel.css';

const DraftsPanel = ({ drafts, loading, onPublish, onEdit, onDelete }) => {
    return (
        <div className="drafts-panel">
            <div className="panel-header">
                <h3>📄 Draft Products</h3>
                <p>Manage unsaved product drafts before publishing to the database</p>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading drafts...</p>
                </div>
            ) : drafts && drafts.length > 0 ? (
                <div className="drafts-list">
                    {drafts.map(draft => (
                        <div key={draft.draft_id} className="draft-card">
                            <div className="card-header">
                                <h4>{draft.name}</h4>
                                <span className="draft-badge">Draft</span>
                            </div>

                            <div className="card-body">
                                <div className="info-row">
                                    <span className="label">Category:</span>
                                    <span className="value">{draft.category}</span>
                                </div>

                                <div className="info-row">
                                    <span className="label">Company:</span>
                                    <span className="value">{draft.company_name || 'N/A'}</span>
                                </div>

                                <div className="info-row">
                                    <span className="label">Created:</span>
                                    <span className="value">{new Date(draft.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="info-row">
                                    <span className="label">Changes:</span>
                                    <span className="value">{Object.keys(draft.data || {}).length} fields</span>
                                </div>
                            </div>

                            <div className="card-footer">
                                <button
                                    className="btn-small btn-primary"
                                    onClick={() => onPublish(draft.draft_id)}
                                    title="Publish this draft"
                                >
                                    ✓ Publish
                                </button>
                                <button
                                    className="btn-small btn-secondary"
                                    onClick={() => onEdit(draft)}
                                    title="Continue editing"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    className="btn-small btn-danger"
                                    onClick={() => onDelete(draft.draft_id)}
                                    title="Delete draft"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>💾 No drafts yet. Start creating products and save them as drafts!</p>
                </div>
            )}

            {drafts && drafts.length > 0 && (
                <div className="panel-footer">
                    <p>Total drafts: <strong>{drafts.length}</strong></p>
                </div>
            )}
        </div>
    );
};

export default DraftsPanel;
