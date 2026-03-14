import React, { useState } from 'react';
import './ProductsTable.css';

const ProductsTable = ({ products, loading, onEdit, onDelete, onFilterChange, filters }) => {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleFilterChange = (field, value) => {
        const newFilters = { ...localFilters, [field]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleSearchChange = (value) => {
        handleFilterChange('searchTerm', value);
    };

    const handleStatusFilter = (status) => {
        handleFilterChange('status', status);
    };

    return (
        <div className="products-table-container">
            <div className="table-header">
                <h3>Product Inventory</h3>
                <p>View and manage all products in the database</p>
            </div>

            {/* Filters */}
            <div className="table-filters">
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="Search products by name or company..."
                        value={localFilters.searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <div className="status-buttons">
                        <button
                            className={`status-btn ${localFilters.status === 'all' ? 'active' : ''}`}
                            onClick={() => handleStatusFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`status-btn ${localFilters.status === 'published' ? 'active' : ''}`}
                            onClick={() => handleStatusFilter('published')}
                        >
                            Published
                        </button>
                        <button
                            className={`status-btn ${localFilters.status === 'draft' ? 'active' : ''}`}
                            onClick={() => handleStatusFilter('draft')}
                        >
                            Draft
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading products...</p>
                </div>
            ) : products && products.length > 0 ? (
                <div className="table-wrapper">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Company</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Created Date</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.product_id} className={product.status === 'draft' ? 'draft-row' : ''}>
                                    <td className="product-name">
                                        <strong>{product.name}</strong>
                                    </td>
                                    <td>{product.company_name || 'N/A'}</td>
                                    <td>{product.subcategory_name || 'Uncategorized'}</td>
                                    <td>
                                        <span className={`status-badge status-${product.status}`}>
                                            {product.status === 'draft' ? '📄 Draft' : '✓ Published'}
                                        </span>
                                    </td>
                                    <td className="date">{new Date(product.created_at).toLocaleDateString()}</td>
                                    <td className="date">{new Date(product.updated_at).toLocaleDateString()}</td>
                                    <td className="actions">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => onEdit(product)}
                                            title="Edit product"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => onDelete(product.product_id)}
                                            title="Delete product"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <p>No products found. Create a new product to get started.</p>
                </div>
            )}

            {/* Pagination info */}
            {products && products.length > 0 && (
                <div className="table-footer">
                    <p>Showing {products.length} product(s)</p>
                </div>
            )}
        </div>
    );
};

export default ProductsTable;
