import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Firebase/Firestore Imports
import { db } from "../../firebase";    
import { collection, getDocs } from 'firebase/firestore'; 

// Import the useCart hook from the context (using path implied by Cart.jsx)
import { useCart } from "../context/CartContext"; 

// --- Configuration Constants ---
const MAX_PRICE_SLIDER_VALUE = 500000; 

// --- 1. Product Card Component (Internalized) ---
const QuantityControl = ({ quantity, onDecrease, onIncrease }) => (
    <div className="flex items-center space-x-3">
        <button
            onClick={onDecrease}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            aria-label="Decrease quantity"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
        </button>
        <span className="w-8 text-center font-medium">{quantity}</span>
        <button
            onClick={onIncrease}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
            aria-label="Increase quantity"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
        </button>
    </div>
);

const ProductCard = ({ product, getProductQuantity, addToCart, updateQuantity, navigate }) => {
    const quantity = getProductQuantity(product.id);

    // Stop propagation to prevent card click navigating when buttons are pressed
    const handleDecrease = (e) => {
        e.stopPropagation();
        updateQuantity(product.id, quantity - 1);
    };

    const handleIncrease = (e) => {
        e.stopPropagation();
        updateQuantity(product.id, quantity + 1);
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        addToCart(product);
    };

    // Check if product has variants with offerPrice
    const hasVariants = product.variants && product.variants.length > 0;
    
    // Get the display price (use variant price if available, otherwise use product price)
    const displayPrice = hasVariants && product.variants[0].price ? 
        Number(product.variants[0].price) : 
        Number(product.price) || 0;
    
    // Get offer price if available (from first variant or product offerPrice)
    const displayOfferPrice = hasVariants && product.variants[0].offerPrice ? 
        Number(product.variants[0].offerPrice) : 
        Number(product.offerPrice) || null;
    
    // Calculate discount percentage if offerPrice exists
    const discountPercentage = displayOfferPrice && displayPrice > displayOfferPrice ? 
        Math.round(((displayPrice - displayOfferPrice) / displayPrice) * 100) : 
        0;

    return (
        <div 
            key={product.id} 
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        >
            {/* Image Section - Navigates to product detail */}
            <div className="relative" onClick={() => navigate(`/product/${product.id}`)}>
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    // Fallback for image loading error
                    onError={(e) => {
                        e.target.onerror = null; 
                        // FIX: Changed to a working placeholder domain
                        e.target.src = 'https://placehold.co/400x300?text=No+Image'; 
                    }}
                />
                {product.isNew && (
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        New
                    </span>
                )}
                {displayOfferPrice && discountPercentage > 0 && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                        -{discountPercentage}%
                    </span>
                )}
            </div>
            
            {/* Content Section */}
            <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2" title={product.name}>
                    {product.name}
                </h3>
                
                {/* Price Display */}
                <div className="flex items-center space-x-2 mb-3">
                    {displayOfferPrice && displayOfferPrice < displayPrice ? (
                        <>
                            <p className="text-lg font-semibold text-red-600">
                                ₹ {displayOfferPrice.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 line-through">
                                ₹ {displayPrice.toLocaleString()}
                            </p>
                        </>
                    ) : (
                        <p className="text-lg font-semibold text-gray-900">
                            ₹ {displayPrice.toLocaleString()}
                        </p>
                    )}
                </div>
                
                {/* Show variant details if available */}
                {hasVariants && product.variants[0].size && (
                    <div className="mb-3">
                        <span className="inline-block bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">
                            Size: {product.variants[0].size}
                        </span>
                        {product.variants[0].stock !== undefined && (
                            <span className={`inline-block ml-2 text-xs px-2 py-1 rounded ${
                                product.variants[0].stock > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                                {product.variants[0].stock > 0 ? `In Stock (${product.variants[0].stock})` : 'Out of Stock'}
                            </span>
                        )}
                    </div>
                )}

                {/* Category badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                    {product.category && (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            {typeof product.category === 'string' ? product.category : product.category.name}
                        </span>
                    )}
                    {product.subcategory && (
                        <span className="inline-block bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">
                            {typeof product.subcategory === 'string' ? product.subcategory : product.subcategory.name}
                        </span>
                    )}
                </div>

                {/* Add to Cart/Quantity Section */}
                <div className="flex items-center justify-between">
                    {quantity > 0 ? (
                        <QuantityControl 
                            quantity={quantity}
                            onDecrease={handleDecrease}
                            onIncrease={handleIncrease}
                        />
                    ) : (
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                            disabled={hasVariants && product.variants[0].stock <= 0}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>
                                {hasVariants && product.variants[0].stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                        className="ml-2 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        aria-label="Quick view"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
// -----------------------------------------------------------------------------

// --- 2. Cart Sidebar Component (Internalized) ---
const CartSidebar = ({ isCartOpen, setIsCartOpen, navigate, cartData }) => {
    const { 
        items: cartItems, 
        removeFromCart, 
        updateQuantity, 
        getCartTotal, 
        getCartItemsCount,
    } = cartData;

    const totalItems = getCartItemsCount();

    const handleCheckout = () => {
        setIsCartOpen(false);
        navigate('/checkout');
    };

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={() => setIsCartOpen(false)}
            ></div>
            
            {/* Sidebar */}
            <div className="absolute right-0 top-0 h-full w-full max-w-xs sm:max-w-md bg-white shadow-xl">
                <div className="flex flex-col h-full">
                    {/* Cart Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Shopping Cart ({totalItems})</h2>
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Close cart"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {cartItems.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                </svg>
                                <p className="text-gray-500 mb-4">Your cart is empty</p>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cartItems.map((item) => {
                                    // Calculate price to display (use offerPrice if available)
                                    const displayPrice = item.offerPrice && item.offerPrice < item.price ? 
                                        item.offerPrice : item.price;
                                    
                                    return (
                                        <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                                                <div className="flex items-center space-x-1">
                                                    <p className="text-blue-600 font-semibold">
                                                        ₹ {(displayPrice * item.quantity).toLocaleString()}
                                                    </p>
                                                    {item.offerPrice && item.offerPrice < item.price && (
                                                        <p className="text-xs text-gray-500 line-through">
                                                            ₹ {(item.price * item.quantity).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    ({item.quantity} x ₹ {displayPrice.toLocaleString()})
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                </button>
                                                <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                                    aria-label="Increase quantity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                                                aria-label="Remove item"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Cart Footer */}
                    {cartItems.length > 0 && (
                        <div className="border-t p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900">Total:</span>
                                <span className="text-xl font-bold text-blue-600">₹ {getCartTotal().toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
                                    Proceed to Checkout
                                </button>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 3. Main EMarket Component ---
const EMarket = () => {
    const navigate = useNavigate();
    const pageTitle = "E-Market";
    
    // State for Filters and UI
    const [selectedCategory, setSelectedCategory] = useState('All Products');
    const [priceRange, setPriceRange] = useState([0, 100000]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // State for Data
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState(['All Products']);
    
    // Use the external cart hook
    const cartData = useCart();
    const { items: cartItems, addToCart, updateQuantity, getCartItemsCount } = cartData;

    // Helper to extract unique categories (Handles both string and object categories for UI)
    const extractCategories = (products) => {
        const uniqueCategories = new Set();
        uniqueCategories.add('All Products');

        products.forEach(product => {
            // Get category name
            let categoryName = '';
            if (typeof product.category === 'string') {
                categoryName = product.category;
            } else if (typeof product.category === 'object' && product.category !== null && product.category.name) {
                categoryName = product.category.name;
            }

            // Get subcategory name
            let subcategoryName = '';
            if (typeof product.subcategory === 'string') {
                subcategoryName = product.subcategory;
            } else if (typeof product.subcategory === 'object' && product.subcategory !== null && product.subcategory.name) {
                subcategoryName = product.subcategory.name;
            }

            if (categoryName.trim() !== '') {
                 uniqueCategories.add(categoryName.trim());
            }
            if (subcategoryName.trim() !== '' && subcategoryName.trim() !== categoryName.trim()) {
                 uniqueCategories.add(subcategoryName.trim());
            }
        });

        return Array.from(uniqueCategories);
    };

    /**
     * @function fetchAllProducts
     * Fetches all documents from the 'products' collection in a single call.
     * Now includes variants data with price and offerPrice
     */
    useEffect(() => {
        const fetchAllProducts = async () => {
            let fetchedProducts = [];
            let maxPrice = 0;
            setLoading(true);

            try {
                // Fetch the entire 'products' collection
                const productsCollectionRef = collection(db, 'products');
                const querySnapshot = await getDocs(productsCollectionRef);

                querySnapshot.forEach((doc) => {
                    const productData = doc.data();
                    
                    // Get price from variants if available, otherwise use product price
                    let price = 0;
                    let offerPrice = null;
                    
                    // Check if product has variants array
                    if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
                        // Use the first variant's price/offerPrice for display
                        const firstVariant = productData.variants[0];
                        price = Number(firstVariant.price) || Number(productData.price) || 0;
                        offerPrice = Number(firstVariant.offerPrice) || Number(productData.offerPrice) || null;
                    } else {
                        // No variants, use product-level pricing
                        price = Number(productData.price) || 0;
                        offerPrice = Number(productData.offerPrice) || null;
                    }
                    
                    // Use offerPrice for price filtering if it exists and is lower
                    const priceForFiltering = offerPrice && offerPrice < price ? offerPrice : price;
                    
                    if (productData && productData.name) {
                        fetchedProducts.push({
                            ...productData,
                            // *** The Firestore Document ID (e.g., cOeOc7GHiFYBC7bEHK) is correctly fetched here. ***
                            id: doc.id,
                            price: price,
                            offerPrice: offerPrice,
                            variants: productData.variants || [],
                            // FIX: Changed to a working placeholder domain
                            image: productData.image || productData.imageUrl || (Array.isArray(productData.imageUrls) && productData.imageUrls.length > 0 ? productData.imageUrls[0].url : 'https://placehold.co/400x300?text=No+Image')
                        });

                        if (priceForFiltering > maxPrice) {
                            maxPrice = priceForFiltering;
                        }
                    }
                });

                setProducts(fetchedProducts);
                const initialMaxRange = Math.min(maxPrice * 1.2, MAX_PRICE_SLIDER_VALUE);
                const finalMaxRange = Math.ceil(initialMaxRange / 1000) * 1000;
                
                setPriceRange([0, finalMaxRange || MAX_PRICE_SLIDER_VALUE]); 
                
                setCategories(extractCategories(fetchedProducts));

            } catch (error) {
                console.error('Error fetching products from Firestore:', error);
                setProducts([]);
                // Fallback to max slider value on error
                setPriceRange([0, MAX_PRICE_SLIDER_VALUE]);
                setCategories(['All Products']);

            } finally {
                setLoading(false);
            }
        };

        fetchAllProducts();
    }, []);

    // Get cart item quantity for a specific product
    const getProductQuantity = (productId) => {
        const item = cartItems.find(item => item.id === productId);
        return item ? item.quantity : 0;
    };

    // Filter products based on search, category, and price range
    const filteredProducts = products.filter(product => {
        // 1. Category Filter: Read category/subcategory string or object.name
        const getCategoryName = (data) => {
            if (typeof data === 'string') return data.toLowerCase();
            if (typeof data === 'object' && data !== null && data.name) return data.name.toLowerCase();
            return '';
        };

        const productCategory = getCategoryName(product.category);
        const productSubcategory = getCategoryName(product.subcategory);
        const selectedCatLower = selectedCategory.toLowerCase();

        const matchesCategory = selectedCategory === 'All Products' ||
            productSubcategory === selectedCatLower ||
            productCategory === selectedCatLower;

        // 2. Search Filter
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());

        // 3. Price Filter - Use offerPrice if available and lower, otherwise use regular price
        const displayPrice = product.offerPrice && product.offerPrice < product.price ? 
            product.offerPrice : product.price;
        const matchesPrice = displayPrice >= priceRange[0] && displayPrice <= priceRange[1];

        return matchesCategory && matchesSearch && matchesPrice;
    });

    const handlePriceChange = (index, value) => {
        const newValue = parseInt(value) || 0;
        const newRange = [...priceRange];
        newRange[index] = newValue;

        // Enforce Min <= Max
        if (index === 0 && newRange[0] > newRange[1]) {
            newRange[1] = newRange[0];
        } else if (index === 1 && newRange[1] < newRange[0]) {
            newRange[0] = newRange[1];
        }

        setPriceRange(newRange);
    };

    // Loading state UI
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading products...</p>
                </div>
            </div>
        );
    }

    // Main Component UI
    return (
        <div className="min-h-screen bg-gray-50">

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* Filters Sidebar */}
                    <div className={`lg:sticky lg:top-20 lg:h-fit lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'} w-full bg-white p-4 rounded-lg shadow-sm border`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                            <button 
                                onClick={() => setShowFilters(false)} 
                                className="lg:hidden text-gray-500 hover:text-gray-800"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Category Filter */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Category</h3>
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <div key={cat} className="flex items-center">
                                        <input
                                            id={`category-${cat}`}
                                            name="category"
                                            type="radio"
                                            checked={selectedCategory === cat}
                                            onChange={() => {
                                                setSelectedCategory(cat);
                                                setShowFilters(false); // Close on mobile after selection
                                            }}
                                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor={`category-${cat}`} className="ml-3 text-sm text-gray-600 cursor-pointer">
                                            {cat}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price Range Filter */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-4">Price Range</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="min-price" className="block text-xs font-medium text-gray-500 mb-1">
                                        Min Price (₹ {priceRange[0].toLocaleString()})
                                    </label>
                                    <input
                                        id="min-price"
                                        type="range"
                                        min="0"
                                        max={MAX_PRICE_SLIDER_VALUE}
                                        step="1000"
                                        value={priceRange[0]}
                                        onChange={(e) => handlePriceChange(0, e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="max-price" className="block text-xs font-medium text-gray-500 mb-1">
                                        Max Price (₹ {priceRange[1].toLocaleString()})
                                    </label>
                                    <input
                                        id="max-price"
                                        type="range"
                                        min="0"
                                        max={MAX_PRICE_SLIDER_VALUE}
                                        step="1000"
                                        value={priceRange[1]}
                                        onChange={(e) => handlePriceChange(1, e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between mt-3 text-sm font-semibold">
                                <span>₹ {priceRange[0].toLocaleString()}</span>
                                <span>₹ {priceRange[1].toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1">
                        
                        {/* Category Tabs (Desktop view) */}
                        <div className="hidden sm:block border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`${
                                            selectedCategory === cat
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        {/* Products Grid */}
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-gray-500 text-lg mb-2">No products found</p>
                                <p className="text-gray-400 text-sm">
                                    Try adjusting your search terms or filters.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {/* MAPS OVER THE FILTERED PRODUCTS TO DISPLAY DATA */}
                                {filteredProducts.map((product) => (
                                    <ProductCard 
                                        key={product.id}
                                        product={product}
                                        getProductQuantity={getProductQuantity}
                                        addToCart={addToCart}
                                        updateQuantity={updateQuantity}
                                        navigate={navigate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart Sidebar */}
            <CartSidebar 
                isCartOpen={isCartOpen}
                setIsCartOpen={setIsCartOpen}
                navigate={navigate}
                cartData={cartData}
            />
        </div>
    );
};

export default EMarket;