const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_OLLAMA_TIMEOUT_MS = 45000;

const PRICE_LIKE_ATTRIBUTE_NAMES = [
    'price',
    'fee',
    'cost',
    'charge',
    'monthly',
    'annual',
    'interest',
    'installment',
    'emi',
    'minimum_balance'
];

const normalizeAttributeName = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const parseJsonSafely = (value, fallbackValue = null) => {
    if (typeof value !== 'string') {
        return value ?? fallbackValue;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return fallbackValue;
    }

    try {
        return JSON.parse(trimmedValue);
    } catch {
        return fallbackValue;
    }
};

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!match) {
        return null;
    }

    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

const getBudgetHints = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    return attributes
        .filter((attribute) => {
            const normalizedName = normalizeAttributeName(attribute?.attribute_name || attribute?.name || '');
            return PRICE_LIKE_ATTRIBUTE_NAMES.some((keyword) => normalizedName.includes(keyword));
        })
        .slice(0, 5)
        .map((attribute) => {
            const attributeName = attribute?.attribute_name || attribute?.name;
            const attributeValue = attribute?.attribute_value ?? attribute?.value;
            return attributeName && attributeValue !== undefined && attributeValue !== null
                ? `${attributeName}: ${attributeValue}`
                : null;
        })
        .filter(Boolean);
};

const extractPromptAttributes = (attributes = []) => {
    if (!Array.isArray(attributes)) {
        return [];
    }

    return attributes
        .slice(0, 8)
        .map((attribute) => {
            const attributeName = attribute?.attribute_name || attribute?.name;
            const attributeValue = attribute?.attribute_value ?? attribute?.value;

            if (!attributeName || attributeValue === null || attributeValue === undefined || attributeValue === '') {
                return null;
            }

            return {
                name: attributeName,
                value: String(attributeValue)
            };
        })
        .filter(Boolean);
};

const truncateText = (value = '', maxLength = 220) => {
    const text = String(value || '').trim();
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength)}...`;
};

const getRatingFromProduct = (product = {}) => {
    const directRating = toNumber(product.rating);
    if (directRating !== null) {
        return directRating;
    }

    const metricsObject = parseJsonSafely(product.metrics, null);
    if (!metricsObject || typeof metricsObject !== 'object' || Array.isArray(metricsObject)) {
        return null;
    }

    return toNumber(metricsObject.rating);
};

const toPromptProducts = (products = []) => {
    return products.slice(0, 5).map((product) => ({
        id: product.id,
        name: product.name,
        company: product.company,
        category: product.category,
        parentCategory: product.parent_category,
        rating: getRatingFromProduct(product),
        description: truncateText(product.description),
        features: Array.isArray(product.features) ? product.features.slice(0, 4) : [],
        budgetHints: getBudgetHints(product.attributes),
        keyAttributes: extractPromptAttributes(product.attributes)
    }));
};

const buildGroundingPrompt = ({ question, products, metadata }) => {
    const preferredCategory = metadata?.preferredCategory || 'not specified';
    const budgetConstraint = metadata?.budgetConstraint || null;

    return [
        'User question:',
        String(question || '').trim(),
        '',
        `Detected category intent: ${preferredCategory}`,
        `Detected budget intent: ${budgetConstraint ? JSON.stringify(budgetConstraint) : 'none'}`,
        '',
        'Available products from database (ground truth):',
        JSON.stringify(toPromptProducts(products), null, 2),
        '',
        'Rules:',
        '1) Use only the products and facts listed above. Do not invent products, prices, rates, or features.',
        '2) Focus only on what the user asked; avoid unrelated information.',
        '3) Recommend the best deal(s) with top 1-3 options and short reasons.',
        '4) If details are missing, say what is missing and ask one clarifying follow-up question.',
        '5) Keep response under 220 words.',
        '6) Use plain text only.'
    ].join('\n');
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
};

const callOpenAI = async ({ prompt, apiKey }) => {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 500,
            messages: [
                {
                    role: 'system',
                    content: 'You are a financial comparison assistant. Answer only from provided DB context.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || !String(content).trim()) {
        throw new Error('OpenAI returned empty content');
    }

    return {
        answer: String(content).trim(),
        modelUsed: model,
        providerUsed: 'openai'
    };
};

const callGemini = async ({ prompt, apiKey }) => {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
        .map((part) => part?.text)
        .filter(Boolean)
        .join('\n')
        .trim();

    if (!text) {
        throw new Error('Gemini returned empty content');
    }

    return {
        answer: text,
        modelUsed: model,
        providerUsed: 'gemini'
    };
};

const callOllama = async ({ prompt }) => {
    const model = (process.env.OLLAMA_MODEL || 'llama3.1:8b').trim();
    const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').trim().replace(/\/+$/g, '');
    const timeoutMs = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || DEFAULT_OLLAMA_TIMEOUT_MS;

    if (!baseUrl) {
        throw new Error('OLLAMA_BASE_URL is missing');
    }

    const response = await fetchWithTimeout(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
                temperature: 0.2
            }
        })
    }, timeoutMs);

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const answer = String(data?.response || '').trim();

    if (!answer) {
        throw new Error('Ollama returned empty content');
    }

    return {
        answer,
        modelUsed: model,
        providerUsed: 'ollama'
    };
};

const callProvider = async ({ provider, prompt, openAiKey, geminiKey }) => {
    if (provider === 'openai') {
        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is missing');
        }
        return callOpenAI({ prompt, apiKey: openAiKey });
    }

    if (provider === 'gemini') {
        if (!geminiKey) {
            throw new Error('GEMINI_API_KEY is missing');
        }
        return callGemini({ prompt, apiKey: geminiKey });
    }

    if (provider === 'ollama') {
        return callOllama({ prompt });
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
};

const getProviderOrder = ({ selectedProvider, openAiKey, geminiKey }) => {
    if (selectedProvider) {
        return [selectedProvider];
    }

    const providers = ['ollama'];

    if (openAiKey) {
        providers.push('openai');
    }

    if (geminiKey) {
        providers.push('gemini');
    }

    return providers;
};

const generateGroundedAiAnswer = async ({ question, rankedProducts, metadata = {}, fallbackAnswer }) => {
    const products = Array.isArray(rankedProducts) ? rankedProducts.slice(0, 5) : [];

    if (!products.length) {
        return {
            answer: fallbackAnswer,
            source: 'heuristic',
            providerUsed: null,
            modelUsed: null
        };
    }

    const selectedProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
    const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

    const providerOrder = getProviderOrder({
        selectedProvider,
        openAiKey,
        geminiKey
    });

    if (!providerOrder.length) {
        return {
            answer: fallbackAnswer,
            source: 'heuristic',
            providerUsed: null,
            modelUsed: null
        };
    }

    const prompt = buildGroundingPrompt({
        question,
        products,
        metadata
    });

    const providerErrors = [];

    for (const providerName of providerOrder) {
        try {
            const result = await callProvider({
                provider: providerName,
                prompt,
                openAiKey,
                geminiKey
            });

            return {
                ...result,
                source: 'llm'
            };
        } catch (error) {
            providerErrors.push(`${providerName}: ${error.message}`);
        }
    }

    return {
        answer: fallbackAnswer,
        source: 'heuristic',
        providerUsed: providerOrder[0] || null,
        modelUsed: null,
        error: providerErrors.join(' | ')
    };
};

module.exports = {
    generateGroundedAiAnswer
};
