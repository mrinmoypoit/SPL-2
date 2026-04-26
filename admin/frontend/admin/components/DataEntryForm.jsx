import React, { useState, useEffect } from 'react';
import { fetchWithApiFallback } from '../../src/utils/apiBase';
import './DataEntryForm.css';

const DataEntryForm = ({ product, onSaved, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        companyId: '',
        categoryId: '',
        subcategoryId: '',
        attributes: []
    });
    const [companies, setCompanies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [featureHighlights, setFeatureHighlights] = useState({
        feature1: '',
        feature2: '',
        feature3: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveAsDraft, setSaveAsDraft] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const token = localStorage.getItem('adminToken');

    const PRODUCT_CATEGORIES = {
        savings_accounts: {
            name: 'Savings Accounts',
            fields: [
                { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '2.5' },
                { name: 'minimum_balance', label: 'Minimum Balance', type: 'number', placeholder: '1000' },
                { name: 'monthly_fee', label: 'Monthly Fee', type: 'number', placeholder: '0' },
                { name: 'withdrawal_limit', label: 'Withdrawal Limit', type: 'text', placeholder: 'Unlimited' },
                { name: 'features', label: 'Key Features', type: 'textarea', placeholder: 'Online banking, Mobile app, etc.' }
            ]
        },
        checking_accounts: {
            name: 'Checking Accounts',
            fields: [
                { name: 'monthly_fee', label: 'Monthly Fee', type: 'number', placeholder: '0' },
                { name: 'minimum_balance', label: 'Minimum Balance', type: 'number', placeholder: '0' },
                { name: 'overdraft_protection', label: 'Overdraft Protection', type: 'checkbox', label2: 'Available' },
                { name: 'atm_access', label: 'ATM Network', type: 'text', placeholder: 'National network' },
                { name: 'features', label: 'Key Features', type: 'textarea', placeholder: 'Debit card, Check writing, etc.' }
            ]
        },
        credit_cards: {
            name: 'Credit Cards',
            fields: [
                { name: 'annual_percentage_rate', label: 'APR (%)', type: 'number', placeholder: '18.5' },
                { name: 'annual_fee', label: 'Annual Fee', type: 'number', placeholder: '0' },
                { name: 'credit_limit', label: 'Credit Limit', type: 'text', placeholder: 'Up to $50,000' },
                { name: 'rewards_rate', label: 'Cash Back / Rewards', type: 'text', placeholder: '1-5%' },
                { name: 'benefits', label: 'Benefits', type: 'textarea', placeholder: 'Travel rewards, Purchase protection, etc.' }
            ]
        },
        loans: {
            name: 'Loans',
            fields: [
                { name: 'loan_amount', label: 'Loan Amount Range', type: 'text', placeholder: '$5,000 - $50,000' },
                { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '5.5' },
                { name: 'loan_term', label: 'Loan Term (months)', type: 'number', placeholder: '60' },
                { name: 'processing_fee', label: 'Processing Fee', type: 'number', placeholder: '0' },
                { name: 'eligibility', label: 'Eligibility Requirements', type: 'textarea', placeholder: 'Age, Credit score, etc.' }
            ]
        }
    };

    const normalizeAttributeList = (attributes = []) =>
        (Array.isArray(attributes) ? attributes : [])
            .map((attr) => ({
                name: String(attr?.name || attr?.attribute_name || '').trim(),
                value: attr?.value ?? attr?.attribute_value ?? '',
                type: attr?.type || attr?.attribute_type || 'text'
            }))
            .map((attr) => ({
                ...attr,
                value: typeof attr.value === 'string' ? attr.value.trim() : attr.value
            }))
            .filter((attr) => attr.name && attr.value !== '' && attr.value !== null && attr.value !== undefined);

    const normalizeFeatureName = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const getFeatureValue = (attributes, featureNumber) => {
        const targetNames = new Set([`feature_${featureNumber}`, `feature${featureNumber}`, `feature_${featureNumber}_highlight`]);
        const match = attributes.find((attr) => targetNames.has(normalizeFeatureName(attr.name)));
        return match ? String(match.value || '') : '';
    };

    const detectTemplateKey = (productData) => {
        const sourceText = `${productData?.subcategory_name || ''} ${productData?.subcategoryName || ''} ${productData?.name || ''}`.toLowerCase();

        if (sourceText.includes('credit')) return 'credit_cards';
        if (sourceText.includes('loan')) return 'loans';
        if (sourceText.includes('current') || sourceText.includes('checking')) return 'checking_accounts';
        if (sourceText.includes('saving') || sourceText.includes('deposit')) return 'savings_accounts';

        return null;
    };

    // Fetch companies and categories on load
    useEffect(() => {
        fetchCompanies();
        fetchCategories();
        fetchSubcategories();
    }, []);

    useEffect(() => {
        fetchSubcategories(formData.categoryId);
    }, [formData.categoryId]);

    // Populate form if editing existing product
    useEffect(() => {
        if (product) {
            const normalizedAttributes = normalizeAttributeList(product.attributes || []);

            setFormData({
                name: product.name || '',
                description: product.description || '',
                companyId: String(product.company_id || product.companyId || ''),
                categoryId: String(product.category_id || product.categoryId || ''),
                subcategoryId: String(product.subcategory_id || product.subcategoryId || ''),
                attributes: normalizedAttributes
            });

            setFeatureHighlights({
                feature1: getFeatureValue(normalizedAttributes, 1),
                feature2: getFeatureValue(normalizedAttributes, 2),
                feature3: getFeatureValue(normalizedAttributes, 3)
            });

            const templateKey = detectTemplateKey(product);
            if (templateKey) {
                setSelectedCategory(templateKey);
            }
        }
    }, [product]);

    const fetchCompanies = async () => {
        try {
            const response = await fetchWithApiFallback('/companies');
            if (response.ok) {
                const data = await response.json();
                setCompanies(data.companies || []);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetchWithApiFallback('/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSubcategories = async (categoryId = '') => {
        try {
            const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
            const response = await fetchWithApiFallback(`/subcategories${query}`);
            if (response.ok) {
                const data = await response.json();
                setSubcategories(data.subcategories || []);
            }
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        }
    };

    const handleBasicFieldChange = (field, value) => {
        if (field === 'categoryId') {
            setFormData(prev => ({
                ...prev,
                categoryId: value,
                subcategoryId: ''
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAttributeChange = (index, attributeName, attributeType, value) => {
        const newAttributes = [...formData.attributes];
        newAttributes[index] = {
            ...(newAttributes[index] || {}),
            name: attributeName,
            type: attributeType || 'text',
            value
        };

        setFormData(prev => ({
            ...prev,
            attributes: newAttributes
        }));
    };

    const handleCategoryChange = (categoryKey) => {
        setSelectedCategory(categoryKey);
        setFormData(prev => ({
            ...prev,
            attributes: []
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const normalizedAttributes = normalizeAttributeList(formData.attributes || []);

            const featureAttributes = [
                { name: 'feature_1', value: featureHighlights.feature1, type: 'text' },
                { name: 'feature_2', value: featureHighlights.feature2, type: 'text' },
                { name: 'feature_3', value: featureHighlights.feature3, type: 'text' }
            ].filter((attr) => attr.value && String(attr.value).trim() !== '');

            const mergedMap = new Map();
            [...normalizedAttributes, ...featureAttributes].forEach((attr) => {
                mergedMap.set(normalizeFeatureName(attr.name), {
                    name: attr.name,
                    value: typeof attr.value === 'string' ? attr.value.trim() : attr.value,
                    type: attr.type || 'text'
                });
            });

            const finalAttributes = Array.from(mergedMap.values()).filter(
                (attr) => attr.name && attr.value !== '' && attr.value !== null && attr.value !== undefined
            );

            const method = product ? 'PUT' : 'POST';

            const response = await fetchWithApiFallback(
                product
                    ? `/admin/products/${product.product_id || product.productId}`
                    : '/admin/products',
                {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    attributes: finalAttributes,
                    saveAsDraft
                })
                }
            );

            if (response.ok) {
                const result = await response.json();
                onSaved(result.data);
                
                setFormData({
                    name: '',
                    description: '',
                    companyId: '',
                    categoryId: '',
                    subcategoryId: '',
                    attributes: []
                });
                setFeatureHighlights({ feature1: '', feature2: '', feature3: '' });
                setSaveAsDraft(false);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to save product');
            }
        } catch (error) {
            setError('Error saving product: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const categoryOptions = Object.entries(PRODUCT_CATEGORIES).map(([key, value]) => ({
        key,
        name: value.name
    }));

    const currentCategoryFields = selectedCategory 
        ? PRODUCT_CATEGORIES[selectedCategory].fields 
        : [];

    const availableSubcategories = formData.categoryId
        ? subcategories.filter((subcategory) => String(subcategory.category_id) === String(formData.categoryId))
        : subcategories;

    return (
        <div className="data-entry-form">
            <div className="form-header">
                <h2>{product ? 'Edit Product' : 'New Product Entry'}</h2>
                <p>Fill in all required fields to {product ? 'update' : 'create'} a product</p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <section className="form-section">
                    <h3>Basic Information</h3>
                    
                    <div className="form-group">
                        <label htmlFor="name">Product Name *</label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => handleBasicFieldChange('name', e.target.value)}
                            placeholder="Enter product name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleBasicFieldChange('description', e.target.value)}
                            placeholder="Enter product description"
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="companyId">Company *</label>
                            <select
                                id="companyId"
                                required
                                value={formData.companyId}
                                onChange={(e) => handleBasicFieldChange('companyId', e.target.value)}
                            >
                                <option value="">Select company</option>
                                {companies.map((company) => (
                                    <option key={company.company_id} value={company.company_id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="categoryId">Category</label>
                            <select
                                id="categoryId"
                                value={formData.categoryId}
                                onChange={(e) => handleBasicFieldChange('categoryId', e.target.value)}
                            >
                                <option value="">All categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="subcategoryId">Subcategory</label>
                        <select
                            id="subcategoryId"
                            value={formData.subcategoryId}
                            onChange={(e) => handleBasicFieldChange('subcategoryId', e.target.value)}
                        >
                            <option value="">Select subcategory</option>
                            {availableSubcategories.map((subcategory) => (
                                <option key={subcategory.id} value={subcategory.id}>
                                    {subcategory.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* Product Category Selection */}
                <section className="form-section">
                    <h3>Product Category</h3>
                    <p className="section-hint">Select a category to fill in specific product details</p>
                    
                    <div className="category-grid">
                        {categoryOptions.map(category => (
                            <button
                                key={category.key}
                                type="button"
                                className={`category-btn ${selectedCategory === category.key ? 'active' : ''}`}
                                onClick={() => handleCategoryChange(category.key)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Category-Specific Attributes */}
                {selectedCategory && (
                    <section className="form-section">
                        <h3>{PRODUCT_CATEGORIES[selectedCategory].name} Details</h3>
                        
                        <div className="attributes-grid">
                            {currentCategoryFields.map((field, index) => (
                                <div key={field.name} className="form-group">
                                    <label htmlFor={field.name}>{field.label}</label>
                                    
                                    {field.type === 'textarea' && (
                                        <textarea
                                            id={field.name}
                                            value={formData.attributes[index]?.value || ''}
                                            onChange={(e) => handleAttributeChange(index, field.name, 'text', e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={3}
                                        />
                                    )}
                                    {field.type === 'text' && (
                                        <input
                                            id={field.name}
                                            type="text"
                                            value={formData.attributes[index]?.value || ''}
                                            onChange={(e) => handleAttributeChange(index, field.name, 'text', e.target.value)}
                                            placeholder={field.placeholder}
                                        />
                                    )}
                                    {field.type === 'number' && (
                                        <input
                                            id={field.name}
                                            type="number"
                                            step="0.01"
                                            value={formData.attributes[index]?.value || ''}
                                            onChange={(e) => handleAttributeChange(index, field.name, 'number', e.target.value)}
                                            placeholder={field.placeholder}
                                        />
                                    )}
                                    {field.type === 'checkbox' && (
                                        <input
                                            id={field.name}
                                            type="checkbox"
                                            checked={formData.attributes[index]?.value === 'true'}
                                            onChange={(e) => handleAttributeChange(index, field.name, 'boolean', e.target.checked ? 'true' : 'false')}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="form-section">
                    <h3>Feature Highlights (User View)</h3>
                    <p className="section-hint">These are shown as Feature 1, Feature 2, Feature 3 in user product cards.</p>

                    <div className="attributes-grid">
                        <div className="form-group">
                            <label htmlFor="feature1">Feature 1</label>
                            <input
                                id="feature1"
                                type="text"
                                value={featureHighlights.feature1}
                                onChange={(e) => setFeatureHighlights((prev) => ({ ...prev, feature1: e.target.value }))}
                                placeholder="e.g., 5% cashback on all purchases"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="feature2">Feature 2</label>
                            <input
                                id="feature2"
                                type="text"
                                value={featureHighlights.feature2}
                                onChange={(e) => setFeatureHighlights((prev) => ({ ...prev, feature2: e.target.value }))}
                                placeholder="e.g., Zero annual fee"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="feature3">Feature 3</label>
                            <input
                                id="feature3"
                                type="text"
                                value={featureHighlights.feature3}
                                onChange={(e) => setFeatureHighlights((prev) => ({ ...prev, feature3: e.target.value }))}
                                placeholder="e.g., Lounge access"
                            />
                        </div>
                    </div>
                </section>

                {/* Save Options */}
                <section className="form-section">
                    <h3>Save Options</h3>
                    
                    <div className="form-group checkbox-group">
                        <input
                            id="saveAsDraft"
                            type="checkbox"
                            checked={saveAsDraft}
                            onChange={(e) => setSaveAsDraft(e.target.checked)}
                        />
                        <label htmlFor="saveAsDraft">
                            Save as Draft
                            <span className="hint">Draft entries can be edited and published later</span>
                        </label>
                    </div>
                </section>

                {/* Form Actions */}
                <div className="form-actions">
                    <button 
                        type="button" 
                        className="btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DataEntryForm;
