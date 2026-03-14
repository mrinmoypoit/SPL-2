import React, { useState, useEffect } from 'react';
import './AdminDataEntryPage.css';
import DataEntryForm from '../components/DataEntryForm';
import ProductsTable from '../components/ProductsTable';
import AuditLogs from '../components/AuditLogs';
import DraftsPanel from '../components/DraftsPanel';

const AdminDataEntryPage = () => {
    const [activeTab, setActiveTab] = useState('entry');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: 'all',
        category: 'all'
    });
    const [stats, setStats] = useState({
        total_products: 0,
        products_today: 0,
        operator_changes: 0,
        changes_today: 0,
        active_drafts: 0
    });

    const token = localStorage.getItem('adminToken');
    const apiBaseUrl = 'http://localhost:3000/api';

    // Fetch statistics
    useEffect(() => {
        if (token) {
            fetchDashboardStats();
        }
    }, [token]);

    // Fetch products
    useEffect(() => {
        if (token && activeTab === 'entry') {
            fetchProducts();
        }
    }, [token, activeTab, filters]);

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/admin/operators/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            let url = `${apiBaseUrl}/admin/products?limit=20&offset=0`;
            if (filters.searchTerm) url += `&searchTerm=${filters.searchTerm}`;
            if (filters.status !== 'all') url += `&status=${filters.status}`;
            if (filters.category !== 'all') url += `&category=${filters.category}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data.data);
            } else {
                setError('Failed to fetch products');
            }
        } catch (error) {
            setError('Error fetching products: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProductSaved = (product) => {
        setSuccessMessage(editingProduct ? 'Product updated successfully' : 'Product created successfully');
        setEditingProduct(null);
        setActiveTab('view');
        fetchProducts();
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setActiveTab('entry');
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`${apiBaseUrl}/admin/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    setSuccessMessage('Product deleted successfully');
                    fetchProducts();
                    setTimeout(() => setSuccessMessage(''), 3000);
                } else {
                    setError('Failed to delete product');
                }
            } catch (error) {
                setError('Error deleting product: ' + error.message);
            }
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
    };

    return (
        <div className="admin-data-entry-page">
            <div className="page-header">
                <h1>Data Entry Management Panel</h1>
                <p>Manage product database across financial institutions</p>
            </div>

            {successMessage && (
                <div className="success-message">
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage('')}>×</button>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            {/* Statistics Bar */}
            <div className="stats-bar">
                <div className="stat-card">
                    <div className="stat-value">{stats.total_products}</div>
                    <div className="stat-label">Total Products</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.products_today}</div>
                    <div className="stat-label">Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.operator_changes}</div>
                    <div className="stat-label">Total Changes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.changes_today}</div>
                    <div className="stat-label">Changes Today</div>
                </div>
                <div className="stat-card draft-card">
                    <div className="stat-value">{stats.active_drafts}</div>
                    <div className="stat-label">Active Drafts</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'entry' ? 'active' : ''}`}
                    onClick={() => setActiveTab('entry')}
                >
                    📝 New Entry / Edit
                </button>
                <button 
                    className={`tab ${activeTab === 'view' ? 'active' : ''}`}
                    onClick={() => setActiveTab('view')}
                >
                    📋 View Products
                </button>
                <button 
                    className={`tab ${activeTab === 'drafts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('drafts')}
                >
                    📄 Drafts
                </button>
                <button 
                    className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    📊 Audit Logs
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'entry' && (
                    <div className="tab-panel">
                        <DataEntryForm 
                            product={editingProduct}
                            onSaved={handleProductSaved}
                            onCancel={handleCancelEdit}
                        />
                    </div>
                )}

                {activeTab === 'view' && (
                    <div className="tab-panel">
                        <ProductsTable 
                            products={products}
                            loading={loading}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onFilterChange={handleFilterChange}
                            filters={filters}
                        />
                    </div>
                )}

                {activeTab === 'drafts' && (
                    <div className="tab-panel">
                        <DraftsPanel 
                            token={token}
                            apiBaseUrl={apiBaseUrl}
                        />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="tab-panel">
                        <AuditLogs 
                            token={token}
                            apiBaseUrl={apiBaseUrl}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDataEntryPage;
