import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const appName = (typeof __app_id !== 'undefined' && __app_id) ? `lm-${__app_id}` : '[DEFAULT]';
const app =
  getApps().find(a => a.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseConfig, appName);

const db = getFirestore(app);
const auth = getAuth(app);
const useFirebaseAuth = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          const userCredential = await signInWithCustomToken(auth, initialAuthToken);
          setUserId(userCredential.user.uid);
        } else {
          const userCredential = await signInAnonymously(auth);
          setUserId(userCredential.user.uid);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        try {
          const userCredential = await signInAnonymously(auth);
          setUserId(userCredential.user.uid);
        } catch (anonError) {
          console.error("Anonymous Sign-in Failed:", anonError);
          setUserId(crypto.randomUUID()); // Last-resort local ID
        }
      } finally {
        setIsAuthReady(true);
      }
    };
    authenticate();
  }, []);
  return { db, auth, userId, isAuthReady };
};

const CartContext = createContext();
const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cartItems: [],
      addToCart: (product) => console.log('Mock addToCart:', product.name, product.selectedSize),
    };
  }
  return context;
};

const useNavigate = () => (path) => console.log('Navigating to:', path);
const LocalMarket = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { db, isAuthReady } = useFirebaseAuth();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState([10, 5000]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['All']);
  const [freshnessFilter, setFreshnessFilter] = useState([]);
  const [deliveryFilter, setDeliveryFilter] = useState([]);
  const [productSelections, setProductSelections] = useState({});

  const extractCategories = (list) => {
    const unique = new Set(['All']);
    list.forEach((p) => {
      if (p.category && p.category.trim() !== '') {
        unique.add(p.category.charAt(0).toUpperCase() + p.category.slice(1));
      }
      if (p.subcategory && p.subcategory.trim() !== '') {
        unique.add(p.subcategory.charAt(0).toUpperCase() + p.subcategory.slice(1));
      }
    });
    return Array.from(unique);
  };
  const fetchProducts = async () => {
    if (!isAuthReady || !db) return;

    try {
      setLoading(true);
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');

      const targetedCategories = ['localmarket', 'vegetables', 'fruits', 'dairy', 'meat', 'grains', 'spices', 'herbs', 'organic'];
      const targetedQuery = query(productsRef, where('category', 'in', targetedCategories));

      let snap = await getDocs(targetedQuery);
      if (snap.empty) {
        snap = await getDocs(productsRef);
      }

      if (snap.empty) {
        setProducts([]);
        setCategories(['All']);
        setProductSelections({});
        return;
      }

      const raw = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
      const processed = raw.map((p) => ({
        ...p,
        price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
      }));

      setProducts(processed);
      setCategories(extractCategories(processed));

      // Initialize selections only from real data
      const defaults = {};
      processed.forEach((p) => {
        const firstColor =
          p?.colorVariants && typeof p.colorVariants === 'object'
            ? p.colorVariants.layer1 || p.colorVariants.layer2 || p.colorVariants.layer3 || ''
            : '';
        const firstSize =
          Array.isArray(p?.sizes) && p.sizes.length > 0 && p.sizes[0]?.size ? p.sizes[0].size : '';
        defaults[p._id] = { color: firstColor, size: firstSize };
      });
      setProductSelections(defaults);
    } catch (e) {
      console.error('Error fetching products:', e);
      setProducts([]);
      setCategories(['All']);
      setProductSelections({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, db]);

  const freshnessLevels = [...new Set(products.map((p) => p.freshness).filter(Boolean))];
  const deliveryOptions = [...new Set(products.map((p) => p.delivery).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const catName = p.category || p.subcategory;
    const matchCategory =
      selectedCategory === 'All' ||
      catName?.toLowerCase() === selectedCategory?.toLowerCase();

    const name = (p.name || '').toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase());

    const price = typeof p.price === 'number' ? p.price : 0;
    const matchPrice = price >= priceRange[0] && price <= priceRange[1];

    const matchFreshness =
      freshnessFilter.length === 0 || (p.freshness && freshnessFilter.includes(p.freshness));
    const matchDelivery =
      deliveryFilter.length === 0 || (p.delivery && deliveryFilter.includes(p.delivery));

    return matchCategory && matchSearch && matchPrice && matchFreshness && matchDelivery;
  });

  const toggleFilter = (value, filter, setFilter) => {
    if (filter.includes(value)) setFilter(filter.filter((f) => f !== value));
    else setFilter([...filter, value]);
  };

  const handleSelect = (productId, type, value) => {
    setProductSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value,
      },
    }));
  };

  const FilterToggleButton = () => (
    <button
      onClick={() => setShowFilters(!showFilters)}
      className="lg:hidden w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 mb-4 shadow-lg hover:shadow-xl transition duration-300"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
      </svg>
      {showFilters ? 'Hide Filters' : 'Show Filters'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-inter">
      <h1 className="text-3xl font-extrabold text-green-800 mb-6 text-center">
        Local Market
      </h1>

      {/* Mobile Filter Toggle */}
      <FilterToggleButton />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className={`w-full lg:w-72 space-y-6 transition-all duration-300 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          {/* Categories */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-green-100">
            <h3 className="text-xl font-bold text-green-700 mb-4 border-b pb-2">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-base transition-all duration-200 flex items-center justify-between ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white font-semibold shadow-md'
                      : 'text-gray-700 hover:bg-green-50 hover:text-green-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-green-100">
            <h3 className="text-xl font-bold text-green-700 mb-4 border-b pb-2">Price Range</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>Min: ₹{priceRange[0]}</span>
                <span>Max: ₹{priceRange[1]}</span>
              </div>
              <input
                type="range"
                min="10"
                max="5000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer range-lg transition-all duration-300"
                style={{ accentColor: '#10B981' }}
              />
            </div>
          </div>

          {/* Freshness */}
          {freshnessLevels.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-5 border border-green-100">
              <h3 className="text-xl font-bold text-green-700 mb-4 border-b pb-2">Freshness</h3>
              <div className="space-y-2">
                {freshnessLevels.map((level) => (
                  <label key={level} className="flex items-center text-gray-700 cursor-pointer hover:text-green-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={freshnessFilter.includes(level)}
                      onChange={() => toggleFilter(level, freshnessFilter, setFreshnessFilter)}
                      className="rounded-md border-gray-300 text-green-600 focus:ring-green-500 w-5 h-5"
                    />
                    <span className="ml-3 text-base">{level}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Delivery */}
          {deliveryOptions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-5 border border-green-100">
              <h3 className="text-xl font-bold text-green-700 mb-4 border-b pb-2">Delivery Time</h3>
              <div className="space-y-2">
                {deliveryOptions.map((option) => (
                  <label key={option} className="flex items-center text-gray-700 cursor-pointer hover:text-green-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={deliveryFilter.includes(option)}
                      onChange={() => toggleFilter(option, deliveryFilter, setDeliveryFilter)}
                      className="rounded-md border-gray-300 text-green-600 focus:ring-green-500 w-5 h-5"
                    />
                    <span className="ml-3 text-base">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar */}
          <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder={`Search in ${selectedCategory === 'All' ? 'all' : selectedCategory} products...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-500 shadow-sm transition-all duration-300"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredProducts.map((product) => {
                const selection = productSelections[product._id] || { color: '', size: '' };

                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 transform hover:-translate-y-1"
                  >
                    <div
                      className="relative h-48 cursor-pointer bg-gray-100 flex items-center justify-center"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name || 'Product'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-gray-400 text-sm">No image</div>
                      )}

                      {product.freshness && product.freshness !== 'Standard' && (
                        <span className="absolute top-3 left-3 text-white text-xs px-3 py-1 rounded-full font-medium shadow-md bg-green-600">
                          {product.freshness}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col justify-between h-[calc(100%-12rem)]">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                          {product.name || 'Unnamed'}
                        </h3>
                        {product.unit && (
                          <p className="text-sm text-gray-500 mb-3 font-medium">{product.unit}</p>
                        )}

                        {/* Color Variants (only if provided) */}
                        {product.colorVariants &&
                          typeof product.colorVariants === 'object' &&
                          Object.keys(product.colorVariants).length > 0 && (
                            <div className="flex space-x-2 mb-3">
                              {['layer1', 'layer2', 'layer3'].map(
                                (layer) =>
                                  product.colorVariants?.[layer] && (
                                    <div
                                      key={layer}
                                      title={`Color ${layer}`}
                                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                                        selection.color === product.colorVariants[layer]
                                          ? 'ring-4 ring-green-400 scale-110'
                                          : 'border-gray-300 hover:scale-105'
                                      }`}
                                      style={{ backgroundColor: product.colorVariants[layer] }}
                                      onClick={() => handleSelect(product._id, 'color', product.colorVariants[layer])}
                                    ></div>
                                  )
                              )}
                            </div>
                          )}

                        {/* Sizes (only if provided) */}
                        {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {product.sizes.map(({ size }) => (
                              <button
                                key={size}
                                className={`px-3 py-1 border rounded-full text-xs font-medium transition-all duration-200 ${
                                  selection.size === size
                                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                                    : 'border-gray-300 text-gray-600 hover:border-green-500 hover:bg-green-50'
                                }`}
                                onClick={() => handleSelect(product._id, 'size', size)}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price & Delivery */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-extrabold text-green-700">
                              ₹{typeof product.price === 'number' ? product.price : 0}
                            </span>
                            {typeof product.originalPrice === 'number' &&
                              typeof product.price === 'number' &&
                              product.originalPrice > product.price && (
                                <span className="text-sm text-gray-500 line-through font-medium">
                                  ₹{product.originalPrice}
                                </span>
                              )}
                          </div>
                          {product.delivery && (
                            <span className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full font-semibold">
                              {product.delivery}
                            </span>
                          )}
                        </div>

                        {/* Add to Cart */}
                        <button
                          onClick={() => {
                            addToCart({
                              ...product,
                              id: product._id,
                              selectedColor: selection.color || '',
                              selectedSize: selection.size || '',
                            });
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-xl shadow-lg mt-8">
              <div className="text-gray-400 text-7xl mb-6">🥕</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No products found</h3>
              <p className="text-gray-500 text-lg">Try broadening your search, filters, or category selection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalMarket;
