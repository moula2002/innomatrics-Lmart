import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const LocalMarket = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

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

  // Fallback images for products without images
  const fallbackImages = [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop', // Vegetables
    'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=300&fit=crop', // Fruits
    'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400&h=300&fit=crop', // Dairy
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop', // Meat
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop', // Grains
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop', // Spices
    'https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=400&h=300&fit=crop', // Herbs
    'https://images.unsplash.com/photo-1594489573857-44a49a53c245?w=400&h=300&fit=crop'  // Organic
  ];

  const extractCategories = (products) => {
    const uniqueCategories = new Set();
    uniqueCategories.add('All');
    products.forEach(product => {
      if (product.category && product.category.trim() !== '') {
        uniqueCategories.add(product.category);
      } else if (product.subcategory && product.subcategory.trim() !== '') {
        uniqueCategories.add(product.subcategory);
      }
    });
    return Array.from(uniqueCategories);
  };

  // Create fallback products in case Firebase has no data
  const createFallbackProducts = () => {
    return [
      {
        _id: '1',
        name: 'Fresh Tomatoes',
        price: 40,
        originalPrice: 50,
        unit: 'per kg',
        category: 'Vegetables',
        subcategory: 'Vegetables',
        freshness: 'Fresh Today',
        delivery: 'Same Day',
        image: fallbackImages[0],
        colorVariants: {
          layer1: '#FF0000',
          layer2: '#8B0000',
          layer3: '#DC143C'
        },
        sizes: [
          { size: '500g' },
          { size: '1kg' },
          { size: '2kg' }
        ]
      },
      {
        _id: '2',
        name: 'Organic Apples',
        price: 120,
        originalPrice: 150,
        unit: 'per kg',
        category: 'Fruits',
        subcategory: 'Fruits',
        freshness: 'Organic',
        delivery: 'Next Day',
        image: fallbackImages[1],
        colorVariants: {
          layer1: '#FF6B6B',
          layer2: '#FF5252',
          layer3: '#FF1744'
        },
        sizes: [
          { size: '500g' },
          { size: '1kg' }
        ]
      },
      {
        _id: '3',
        name: 'Fresh Milk',
        price: 60,
        originalPrice: 70,
        unit: 'per liter',
        category: 'Dairy',
        subcategory: 'Dairy',
        freshness: 'Farm Fresh',
        delivery: '2-4 Hours',
        image: fallbackImages[2],
        colorVariants: {
          layer1: '#FFFFFF',
          layer2: '#F5F5F5',
          layer3: '#E8E8E8'
        },
        sizes: [
          { size: '500ml' },
          { size: '1L' },
          { size: '2L' }
        ]
      },
      {
        _id: '4',
        name: 'Chicken Breast',
        price: 280,
        originalPrice: 320,
        unit: 'per kg',
        category: 'Meat',
        subcategory: 'Meat',
        freshness: 'Fresh Today',
        delivery: 'Same Day',
        image: fallbackImages[3],
        colorVariants: {
          layer1: '#FFD700',
          layer2: '#FFC125',
          layer3: '#FFB90F'
        },
        sizes: [
          { size: '500g' },
          { size: '1kg' }
        ]
      },
      {
        _id: '5',
        name: 'Basmati Rice',
        price: 80,
        originalPrice: 90,
        unit: 'per kg',
        category: 'Grains',
        subcategory: 'Grains',
        freshness: 'Farm Fresh',
        delivery: 'Next Day',
        image: fallbackImages[4],
        colorVariants: {
          layer1: '#FFF8DC',
          layer2: '#FFEBCD',
          layer3: '#FFEFD5'
        },
        sizes: [
          { size: '1kg' },
          { size: '5kg' },
          { size: '10kg' }
        ]
      }
    ];
  };

  // Fetch products from Firebase with fallback
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      
      // Try to fetch local market products first
      const q = query(
        productsRef, 
        where('category', 'in', ['localmarket', 'vegetables', 'fruits', 'dairy', 'meat', 'grains', 'spices', 'herbs', 'organic'])
      );
      
      const querySnapshot = await getDocs(q);
      
      let productsData = [];
      
      if (!querySnapshot.empty) {
        // Use Firebase data
        productsData = querySnapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data()
        }));
      } else {
        // Fallback to all products if no category match
        const allProductsSnapshot = await getDocs(productsRef);
        if (!allProductsSnapshot.empty) {
          productsData = allProductsSnapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
          }));
        } else {
          // Final fallback to dummy data
          productsData = createFallbackProducts();
        }
      }

      // Process products - ensure they have required fields and images
      const processedProducts = productsData.map((product, index) => ({
        ...product,
        image: product.image || fallbackImages[index % fallbackImages.length],
        originalPrice: product.originalPrice || Math.round(product.price * 1.2),
        category: product.category || product.subcategory || 'General',
        subcategory: product.subcategory || product.category || 'General',
        freshness: product.freshness || 'Standard',
        delivery: product.delivery || 'Next Day',
        unit: product.unit || 'per item',
        colorVariants: product.colorVariants || {
          layer1: '#4CAF50',
          layer2: '#45a049',
          layer3: '#388E3C'
        },
        sizes: product.sizes || [{ size: 'Standard' }]
      }));

      setProducts(processedProducts);
      setCategories(extractCategories(processedProducts));

      // Initialize product selections
      const defaults = {};
      processedProducts.forEach(product => {
        defaults[product._id] = {
          color: product.colorVariants?.layer1 || '',
          size: product.sizes?.[0]?.size || ''
        };
      });
      setProductSelections(defaults);

    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to dummy products on error
      const fallbackProducts = createFallbackProducts();
      setProducts(fallbackProducts);
      setCategories(extractCategories(fallbackProducts));

      const defaults = {};
      fallbackProducts.forEach(product => {
        defaults[product._id] = {
          color: product.colorVariants?.layer1 || '',
          size: product.sizes?.[0]?.size || ''
        };
      });
      setProductSelections(defaults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Extract unique freshness levels and delivery options from products
  const freshnessLevels = [...new Set(products.map(p => p.freshness).filter(Boolean))];
  const deliveryOptions = [...new Set(products.map(p => p.delivery).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'All' || 
                         (p.category && p.category === selectedCategory) || 
                         (p.subcategory && p.subcategory === selectedCategory);
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchFreshness = freshnessFilter.length === 0 || (p.freshness && freshnessFilter.includes(p.freshness));
    const matchDelivery = deliveryFilter.length === 0 || (p.delivery && deliveryFilter.includes(p.delivery));
    
    return matchCategory && matchSearch && matchPrice && matchFreshness && matchDelivery;
  });

  const toggleFilter = (value, filter, setFilter) => {
    if (filter.includes(value)) setFilter(filter.filter(f => f !== value));
    else setFilter([...filter, value]);
  };

  const handleSelect = (productId, type, value) => {
    setProductSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value
      }
    }));
  };

  // Mobile filter toggle button
  const FilterToggleButton = () => (
    <button 
      onClick={() => setShowFilters(!showFilters)}
      className="lg:hidden w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 mb-4"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
      </svg>
      {showFilters ? 'Hide Filters' : 'Show Filters'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Filter Toggle */}
      <FilterToggleButton />

      <div className="max-w-full mx-auto px-2 py-6 flex flex-col lg:flex-row gap-4">
        {/* Sidebar Filters */}
        <div className={`w-full lg:w-72 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          {/* Categories */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === category ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Freshness Filter - Only show if there are freshness options */}
          {freshnessLevels.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Freshness</h3>
              <div className="space-y-2">
                {freshnessLevels.map(level => (
                  <label key={level} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={freshnessFilter.includes(level)}
                      onChange={() => toggleFilter(level, freshnessFilter, setFreshnessFilter)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{level}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Time Filter - Only show if there are delivery options */}
          {deliveryOptions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Time</h3>
              <div className="space-y-2">
                {deliveryOptions.map(option => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={deliveryFilter.includes(option)}
                      onChange={() => toggleFilter(option, deliveryFilter, setDeliveryFilter)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Range</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
              <input
                type="range"
                min="10"
                max="5000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search fresh products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Category Tabs */}
          <div className="mb-6">
            <div className="flex overflow-x-auto space-x-1 bg-gray-100 p-1 rounded-lg scrollbar-hide">
              {categories.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedCategory(tab)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === tab
                      ? 'bg-white text-green-900 shadow-sm'
                      : 'text-gray-600 hover:text-green-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredProducts.map(product => {
                const selection = productSelections[product._id] || {};
                return (
                  <div key={product._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group border border-gray-100">
                    <div className="relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                        onClick={() => navigate(`/product/${product._id}`)}
                      />
                      {product.freshness === 'Fresh Today' && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          Fresh Today
                        </span>
                      )}
                      {product.freshness === 'Organic' && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          Organic
                        </span>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{product.unit}</p>

                      {/* Color Variants */}
                      <div className="flex space-x-2 mb-3">
                        {['layer1','layer2','layer3'].map(layer => product.colorVariants?.[layer] && (
                          <div
                            key={layer}
                            title={`Color ${layer}`}
                            className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${
                              selection.color === product.colorVariants[layer] ? 'ring-2 ring-green-500 scale-110' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: product.colorVariants[layer] }}
                            onClick={() => handleSelect(product._id, 'color', product.colorVariants[layer])}
                          ></div>
                        ))}
                      </div>

                      {/* Sizes */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.sizes?.length > 0 ? product.sizes.map(({ size }) => (
                          <button
                            key={size}
                            className={`px-3 py-1 border rounded-full text-xs font-medium transition-all ${
                              selection.size === size 
                                ? 'bg-green-500 text-white border-green-500' 
                                : 'border-gray-300 text-gray-600 hover:border-green-500'
                            }`}
                            onClick={() => handleSelect(product._id, 'size', size)}
                          >
                            {size}
                          </button>
                        )) : (
                          <span className="text-xs text-gray-500">No sizes</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-green-600">₹{product.price}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
                          )}
                        </div>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {product.delivery}
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() =>
                          addToCart({
                            ...product,
                            id: product._id,
                            selectedColor: selection.color,
                            selectedSize: selection.size
                          })
                        }
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500">Try changing your filters or search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalMarket;