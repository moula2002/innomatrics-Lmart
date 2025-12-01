import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc, getDoc,
  collection, query, where, getDocs, addDoc, serverTimestamp
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useCart } from "../context/CartContext";

// --- START: Rating and Review Helper Components ---

// Helper function to render stars for display
const StarRating = ({ rating, size = 'w-4 h-4', color = 'text-green-500' }) => {
  const fullStars = Math.floor(rating);
  const starArray = Array(5).fill(null).map((_, index) => {
    const i = index + 1;
    let starColor = (i <= fullStars) ? color : 'text-gray-300';

    return (
      <svg key={index} className={`${size} ${starColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1-81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  });
  return <div className="flex">{starArray}</div>;
};

// Component for the distribution bar
const StarBar = ({ count, total, star }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  // Apply green/yellow color based on rating score
  const barColor = star >= 3 ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <div className="flex items-center space-x-2">
      <div className="w-40 bg-gray-200 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- START: Write Review Modal Component ---

const WriteReviewModal = ({ onClose, onSubmit, productName }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarClick = (newRating) => {
    setRating(newRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || !title.trim() || !content.trim()) {
      alert("Please provide a rating, title, and review content.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit({
        rating,
        title: title.trim(),
        content: content.trim()
      });
      if (success) {
        // If submission is successful, close the modal
        onClose();
      }
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-900">Write a Review for {productName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Rating Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
            <div className="flex space-x-1">
              {Array(5).fill(null).map((_, index) => (
                <svg
                  key={index}
                  onClick={() => handleStarClick(index + 1)}
                  className={`w-8 h-8 cursor-pointer transition-colors ${index < rating ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label htmlFor="reviewTitle" className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
            <input
              id="reviewTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-purple-500 focus:border-purple-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Review Content */}
          <div>
            <label htmlFor="reviewContent" className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
            <textarea
              id="reviewContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you like or dislike about the product?"
              rows="4"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-purple-500 focus:border-purple-500 resize-none"
              disabled={isSubmitting}
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-semibold py-3 rounded-lg transition-colors flex items-center justify-center ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
// --- END: Write Review Modal Component ---

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const storage = getStorage();
  const { addToCart } = useCart();

  const productFromState = location.state?.product;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMainImage, setCurrentMainImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [fullImageList, setFullImageList] = useState([]);
  const [colorImagesMap, setColorImagesMap] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);

  // NEW: State for showing max quantity message
  const [showMaxQuantityMessage, setShowMaxQuantityMessage] = useState(false);

  // NEW: State to track available sizes for selected color
  const [availableSizes, setAvailableSizes] = useState([]);

  // State to hold the dynamic review data fetched from Firestore
  const [reviewData, setReviewData] = useState({
    averageRating: 0.0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: []
  });

  // --- REVIEW DATA CALCULATOR ---
  const calculateReviewData = (reviews) => {
    const totalRatings = reviews.length;
    let sumRatings = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalRatings === 0) {
      return { averageRating: 0.0, totalReviews: 0, distribution, reviews: [] };
    }

    reviews.forEach(review => {
      sumRatings += review.rating;
      // Ensure rating is an integer between 1 and 5 for distribution
      const floorRating = Math.floor(review.rating);
      if (floorRating >= 1 && floorRating <= 5) {
        distribution[floorRating] = (distribution[floorRating] || 0) + 1;
      }
    });

    const averageRating = sumRatings / totalRatings;

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: totalRatings,
      distribution,
      // Sort by newest first (assuming createdAt is a Firestore Timestamp)
      reviews: reviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    };
  };

  // Utility function: Fetch image URL from Storage
  const fetchImageURL = useCallback(async (path) => {
    if (!path) return null;
    try {
      const url = await getDownloadURL(ref(storage, path));
      return url;
    } catch (error) {
      console.error("Error loading image from Storage:", path, error);
      return 'https://via.placeholder.com/400x300?text=Image+Load+Error';
    }
  }, [storage]);

  // --- FIREBASE REVIEW FETCHER ---
  const fetchReviews = useCallback(async () => {
    if (!productId) return;

    try {
      const q = query(
        collection(db, "reviews"),
        where("productId", "==", productId)
      );

      const querySnapshot = await getDocs(q);
      const fetchedReviews = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleDateString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric' }),
        createdAt: doc.data().createdAt
      }));

      setReviewData(calculateReviewData(fetchedReviews));
    } catch (error) {
      console.error("Error fetching product reviews:", error);
    }
  }, [productId]);

  // --- FIREBASE REVIEW SUBMITTER ---
  const handleSubmitReview = async ({ rating, title, content }) => {
    const mockUserId = "USER_" + Math.random().toString(36).substring(2, 9);
    const mockUserName = "Authenticated User";

    const newReview = {
      productId,
      rating,
      title,
      content,
      userId: mockUserId,
      userName: mockUserName,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "reviews"), newReview);
      await fetchReviews();
      return true;
    } catch (error) {
      console.error("Error adding review document:", error);
      return false;
    }
  };

  // Utility functions
  const detectCategory = () => {
    if (productFromState?.category) return productFromState.category;
    if (location.pathname.includes('local')) return 'localmarket';
    if (location.pathname.includes('print')) return 'printing';
    return 'emarket';
  };

  // Get unique colors and sizes from variants
  const extractVariantsInfo = (variants) => {
    if (!variants || variants.length === 0) {
      return { colors: [], sizes: [], colorVariants: {}, colorSizeMap: {} };
    }

    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

    const colorVariants = {};
    const colorSizeMap = {}; // NEW: Map to track sizes for each color

    variants.forEach(variant => {
      if (variant.color) {
        if (!colorVariants[variant.color]) {
          colorVariants[variant.color] = [];
        }
        colorVariants[variant.color].push(variant);

        // NEW: Build color-size mapping
        if (!colorSizeMap[variant.color]) {
          colorSizeMap[variant.color] = new Set();
        }
        if (variant.size) {
          colorSizeMap[variant.color].add(variant.size);
        }
      }
    });

    return { colors, sizes, colorVariants, colorSizeMap };
  };

  // NEW: Function to get available sizes for a color
  const getAvailableSizesForColor = (color) => {
    if (!product || !product.colorSizeMap || !product.colorSizeMap[color]) {
      return [];
    }
    return Array.from(product.colorSizeMap[color]);
  };

  // NEW: Show max quantity message
  const showMaxQuantityAlert = () => {
    setShowMaxQuantityMessage(true);
    // Hide the message after 3 seconds
    setTimeout(() => {
      setShowMaxQuantityMessage(false);
    }, 3000);
  };

  // Main data fetching effect
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);

        const fallbackImageUrl = 'https://via.placeholder.com/400x300?text=No+Image';

        // Fetch product from Firestore
        const productRef = doc(db, "products", productId);
        const snap = await getDoc(productRef);

        if (snap.exists()) {
          const data = snap.data();
          console.log("Fetched product data from Firestore:", data);

          // Extract variants information
          const variants = data.variants || [];
          const { colors, sizes, colorVariants, colorSizeMap } = extractVariantsInfo(variants);

          // Process image URLs
          let imageList = [];
          const colorImageMapping = {};

          // Process imageUrls array from Firestore
          if (data.imageUrls && Array.isArray(data.imageUrls)) {
            for (const imageObj of data.imageUrls) {
              if (imageObj.url) {
                imageList.push(imageObj.url);

                // Map color to image index
                if (imageObj.color && !colorImageMapping[imageObj.color]) {
                  colorImageMapping[imageObj.color] = imageList.length - 1;
                }

                // Set main image
                if (imageObj.isMain) {
                  setCurrentMainImage(imageObj.url);
                }
              }
            }
          }

          // Add mainImageUrl if exists
          if (data.mainImageUrl && !imageList.includes(data.mainImageUrl)) {
            imageList.unshift(data.mainImageUrl);
            if (!currentMainImage) {
              setCurrentMainImage(data.mainImageUrl);
            }
          }

          // Set default selected color and size
          let defaultColor = colors.length > 0 ? colors[0] : "";
          let defaultSize = "";
          let defaultVariant = null;

          if (defaultColor) {
            setSelectedColor(defaultColor);

            // NEW: Set available sizes for the default color
            const sizesForColor = Array.from(colorSizeMap[defaultColor] || []);
            setAvailableSizes(sizesForColor);

            // Set default size from available sizes
            if (sizesForColor.length > 0) {
              defaultSize = sizesForColor[0];
              setSelectedSize(defaultSize);
            }

            // Find variant for selected color and size
            defaultVariant = variants.find(v =>
              v.color === defaultColor &&
              (!defaultSize || v.size === defaultSize)
            ) || variants.find(v => v.color === defaultColor) || {};
          }

          setSelectedVariant(defaultVariant);

          // Determine overall inStock status based on whether there's at least one variant with stock > 0
          const hasStock = variants.some(v => v.stock > 0);

          // Create final product data object
          const finalData = {
            id: snap.id,
            name: data.name || "Unnamed Product",
            description: data.description || "No description available",
            brand: data.brand || "Generic",
            category: data.category || {},
            sellerId: data.selterId || data.sellerId || "default_seller",
            sku: data.sku || "N/A",
            hsnCode: data.hsnCode || "N/A",
            status: data.status || "active",
            searchKeywords: data.searchKeywords || [],
            mainImageUrl: data.mainImageUrl || imageList[0] || fallbackImageUrl,
            imageUrls: data.imageUrls || [],
            variants: variants,
            colors: colors,
            sizes: sizes,
            colorVariants: colorVariants,
            colorSizeMap: colorSizeMap, // NEW: Include color-size map
            inStock: hasStock, // UPDATED: Use calculated hasStock
            ratings: data.ratings || 0,
            reviews: data.reviews || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            features: data.features || [],
            // UPDATED: Only brand and category in productDetails
            productDetails: {
              brand: data.brand || "Generic",
              category: data.category?.name || "Uncategorized"
            }
          };

          setProduct(finalData);
          setFullImageList(imageList);
          setColorImagesMap(colorImageMapping);

          // Fetch reviews
          fetchReviews();
        } else {
          setProduct(null);
        }

      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId, fetchImageURL, fetchReviews]);

  // Update selected variant and available sizes when color changes
  useEffect(() => {
    if (product && selectedColor) {
      // NEW: Update available sizes for selected color
      const sizesForColor = getAvailableSizesForColor(selectedColor);
      setAvailableSizes(sizesForColor);

      // Reset selected size if not available in new color
      if (selectedSize && !sizesForColor.includes(selectedSize)) {
        setSelectedSize(sizesForColor.length > 0 ? sizesForColor[0] : "");
      }

      // Find variant for selected color
      let variantForColor = null;
      if (selectedSize && sizesForColor.includes(selectedSize)) {
        variantForColor = product.variants.find(v =>
          v.color === selectedColor && v.size === selectedSize
        );
      }

      if (!variantForColor && sizesForColor.length > 0) {
        variantForColor = product.variants.find(v =>
          v.color === selectedColor && v.size === sizesForColor[0]
        ) || product.variants.find(v => v.color === selectedColor);
      }

      if (variantForColor) {
        setSelectedVariant(variantForColor);
      }

      // Update image if color has associated image
      if (colorImagesMap[selectedColor] !== undefined) {
        const imageIndex = colorImagesMap[selectedColor];
        if (imageIndex >= 0 && imageIndex < fullImageList.length) {
          setSelectedImageIndex(imageIndex);
          setCurrentMainImage(fullImageList[imageIndex]);
        }
      }
    }
  }, [selectedColor, product, colorImagesMap, fullImageList]);

  // Update selected variant when size changes
  useEffect(() => {
    if (product && product.variants && selectedColor && selectedSize) {
      const variantForColorAndSize = product.variants.find(v =>
        v.color === selectedColor && v.size === selectedSize
      );
      if (variantForColorAndSize) {
        setSelectedVariant(variantForColorAndSize);
      }
    }
  }, [selectedSize, product, selectedColor]);

  // Handler for color selection
  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

  // Handler for size selection
  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  // Handler for thumbnail image click
  const handleThumbnailClick = (index) => {
    setSelectedImageIndex(index);
    setCurrentMainImage(fullImageList[index]);

    // Find which color corresponds to this image
    for (const [color, imgIndex] of Object.entries(colorImagesMap)) {
      if (imgIndex === index) {
        setSelectedColor(color);
        break;
      }
    }
  };

  // UPDATED: Quantity increment with stock limit and popup message
  const incrementQuantity = () => {
    // Check if a variant is selected and has a stock value
    const maxStock = selectedVariant?.stock;
    if (maxStock !== undefined && maxStock !== null) {
      if (quantity < maxStock) {
        setQuantity(prev => prev + 1);
      } else {
        // Show popup message when trying to exceed stock
        showMaxQuantityAlert();
      }
    } else {
      // If stock is not defined on the variant, allow increment
      setQuantity(prev => prev + 1);
    }
  };

  // UPDATED: Quantity decrement
  const decrementQuantity = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = async () => {
    // Check if the selected variant is available (stock > 0) or if stock is undefined (assumed available)
    const isInStock = selectedVariant?.stock === undefined || selectedVariant.stock > 0;
    if (!product || !isInStock || !selectedVariant) return; // Use isInStock for specific variant

    setAddingToCart(true);
    try {
      const imageForCart = fullImageList[selectedImageIndex] || currentMainImage || product.mainImageUrl;

      const cartItem = {
        id: product.id,
        name: product.name,
        price: selectedVariant.offerPrice || selectedVariant.price || 0,
        originalPrice: selectedVariant.price || selectedVariant.offerPrice || 0,
        quantity,
        selectedColor,
        selectedSize,
        selectedVariantId: selectedVariant.variantId,
        image: imageForCart,
        description: product.description,
        colors: product.colors || [],
        sizes: availableSizes || [],
        variantId: selectedVariant.variantId,
        stock: selectedVariant.stock || 0,
        sellerId: product.sellerId,
        sku: product.sku || `SKU-${Date.now()}`,
        brand: product.brand || "Generic"
      };

      addToCart(cartItem);
      setTimeout(() => { setAddingToCart(false); }, 1000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    // Check if the selected variant is available (stock > 0) or if stock is undefined (assumed available)
    const isInStock = selectedVariant?.stock === undefined || selectedVariant.stock > 0;
    if (!product || !isInStock || !selectedVariant) return;

    const imageForCart = fullImageList[selectedImageIndex] || currentMainImage || product.mainImageUrl;

    const cartItem = {
      id: product.id,
      name: product.name,
      price: selectedVariant.offerPrice || selectedVariant.price || 0,
      originalPrice: selectedVariant.price || selectedVariant.offerPrice || 0,
      quantity,
      selectedColor,
      selectedSize,
      selectedVariantId: selectedVariant.variantId,
      image: imageForCart,
      description: product.description,
      colors: product.colors || [],
      sizes: availableSizes || [],
      variantId: selectedVariant.variantId,
      stock: selectedVariant.stock || 0,
      sellerId: product.sellerId,
      sku: product.sku || `SKU-${Date.now()}`,
      brand: product.brand || "Generic"
    };

    addToCart(cartItem);
    setTimeout(() => { navigate("/checkout"); }, 500);
  };

  const getBackButtonPath = () => {
    const category = detectCategory();
    switch (category) {
      case 'localmarket': return '/local-market';
      case 'printing': return '/printing';
      default: return '/e-market';
    }
  };

  const getCategoryName = () => {
    const category = detectCategory();
    switch (category) {
      case 'localmarket': return 'Local Market';
      case 'printing': return 'Printing Services';
      default: return 'E-Market';
    }
  };

  // Calculate discount percentage
  const calculateDiscount = (originalPrice, offerPrice) => {
    if (!originalPrice || !offerPrice || originalPrice <= offerPrice) return 0;
    return Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
  };

  // Determine variant in stock status
  const isVariantInStock = selectedVariant?.stock === undefined ? true : selectedVariant.stock > 0;

  // UI Rendering
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Product Not Found</h2>
          <button
            onClick={() => navigate(getBackButtonPath())}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Back to {getCategoryName()}
          </button>
        </div>
      </div>
    );
  }

  const discountPercentage = selectedVariant ?
    calculateDiscount(selectedVariant.price, selectedVariant.offerPrice) : 0;

  const displayPrice = selectedVariant?.offerPrice || selectedVariant?.price || 0;
  const displayOriginalPrice = selectedVariant?.price || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      {showReviewModal && product && (
        <WriteReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleSubmitReview}
          productName={product.name}
        />
      )}

      {/* Max Quantity Message Popup */}
      {showMaxQuantityMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Maximum quantity reached! Only {selectedVariant?.stock || 0} units available.</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-700">Home</button></li>
            <li><span className="text-gray-400">›</span></li>
            <li><button onClick={() => navigate(getBackButtonPath())} className="text-gray-500 hover:text-gray-700">{getCategoryName()}</button></li>
            <li><span className="text-gray-400">›</span></li>
            <li><span className="text-gray-600">{product.name.split(' ').slice(0, 2).join(' ')}</span></li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Product Images (Left Side) */}
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={currentMainImage || 'https://via.placeholder.com/400x300?text=Image+Loading+Error'}
                  alt={product.name}
                  className="w-full h-80 object-cover"
                />
              </div>

              {fullImageList.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {fullImageList.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`bg-gray-100 rounded-lg overflow-hidden border transition-all ${selectedImageIndex === index
                        ? 'border-purple-500 scale-105'
                        : 'border-transparent hover:border-gray-300'
                        }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details (Right Side) */}
            <div className="space-y-6">
              {/* Product Header */}
              <div>
                {product.brand && (
                  <p className="text-sm font-semibold text-purple-600 uppercase mb-1">{product.brand}</p>
                )}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

                {/* Ratings and Reviews */}
                <div className="flex items-center space-x-4 mb-3">
                  {reviewData.averageRating > 0 && (
                    <div className="flex items-center bg-green-600 text-white px-2 py-1 rounded text-sm">
                      <span className="font-bold">{reviewData.averageRating.toFixed(1)}</span>
                      <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                  <span className="text-blue-600 font-medium text-sm">{reviewData.totalReviews.toLocaleString()} ratings</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600 font-medium text-sm">{reviewData.totalReviews.toLocaleString()} reviews</span>
                </div>

                {/* Stock Status - UPDATED: Use isVariantInStock for selected variant */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${isVariantInStock
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                  }`}>
                  {isVariantInStock ? 'In Stock' : 'Out of Stock'}
                </div>
                
                {/* --- START: REMOVED Product Description Section --- */}
                {/* <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p> */}
                {/* --- END: REMOVED Product Description Section --- */}


                {/* Color Selection Section */}
                {product.colors && product.colors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Color: <span className="text-purple-600">{selectedColor}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={`px-3 py-1 rounded border font-medium text-sm transition-all flex items-center justify-center min-w-[80px] ${selectedColor === color
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Section - RETAINED */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{displayPrice}
                    </span>
                    {discountPercentage > 0 && (
                      <>
                        <span className="text-lg text-gray-500 line-through">
                          ₹{displayOriginalPrice}
                        </span>
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                          {discountPercentage}% off
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Size Selection - UPDATED: Show only sizes available for selected color */}
                {availableSizes && availableSizes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Size: <span className="text-purple-600">{selectedSize || (availableSizes.length > 0 ? "Select Size" : "No sizes available")}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(size)}
                          className={`px-3 py-2 rounded border font-medium text-sm transition-all ${selectedSize === size
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {availableSizes.length === 0 && selectedColor && (
                      <p className="text-sm text-red-500">
                        No sizes available for {selectedColor} color
                      </p>
                    )}
                  </div>
                )}

                {/* Product Details Table - UPDATED: Only brand and category */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="w-1/3 text-gray-600">Brand</span>
                      <span className="w-2/3 text-gray-900">{product.brand || "Generic"}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-gray-600">Category</span>
                      <span className="w-2/3 text-gray-900">{product.category?.name || "Uncategorized"}</span>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector - REMOVED: Max stock display */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                    {/* Removed: Max stock display here */}
                  </div>
                  <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className={`px-3 py-1 rounded-l-lg transition-colors ${quantity <= 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                      -
                    </button>
                    <span className="px-4 py-1 border-x border-gray-300 font-medium min-w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
                      // Use isVariantInStock logic to disable if no stock or max quantity reached
                      disabled={!isVariantInStock || (selectedVariant?.stock && quantity >= selectedVariant.stock)}
                      className={`px-3 py-1 rounded-r-lg transition-colors ${!isVariantInStock || (selectedVariant?.stock && quantity >= selectedVariant.stock)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                      +
                    </button>
                  </div>
                  {/* Replaced max stock message with a simpler info message if applicable */}
                  {selectedVariant?.stock !== undefined && selectedVariant.stock > 0 && (
                    <p className="text-sm text-gray-500">
                      You can order up to {selectedVariant.stock} units.
                    </p>
                  )}
                  {!isVariantInStock && (
                    <p className="text-sm text-red-500 font-medium">
                      This variant is currently Out of Stock.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleAddToCart}
                    // Use isVariantInStock for button logic
                    disabled={!isVariantInStock || addingToCart || !selectedVariant}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${isVariantInStock && !addingToCart && selectedVariant
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {addingToCart ? (
                      <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...</>
                    ) : (
                      isVariantInStock ? 'Add to Cart' : 'Out of Stock' // Use isVariantInStock for text
                    )}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    // Use isVariantInStock for button logic
                    disabled={!isVariantInStock || !selectedVariant}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${isVariantInStock && selectedVariant
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Buy Now
                  </button>
                </div>

                {/* Additional Information */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>✓ 10 days return policy</div>
                    <div>✓ Cash on delivery available</div>
                    <div>✓ Free delivery on orders above ₹499</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ratings and Reviews Section */}
        <div className="bg-white rounded-xl shadow-sm border mt-6 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ratings Overview */}
            <div className="lg:col-span-1 border-r pr-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ratings</h2>

              {/* Average Rating Display */}
              <div className="flex items-center space-x-4 mb-6">
                <p className="text-5xl font-extrabold text-gray-900">
                  {reviewData.averageRating.toFixed(1)}
                </p>
                <div className="space-y-1">
                  <StarRating rating={reviewData.averageRating} size='w-6 h-6' />
                  <p className="text-base text-gray-500">
                    {reviewData.totalReviews.toLocaleString()} Product Ratings
                  </p>
                </div>
              </div>

              {/* Rating Distribution Bars */}
              <div className="space-y-3 mb-8">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-700 w-6">{star}★</span>
                    <StarBar
                      count={reviewData.distribution[star] || 0}
                      total={reviewData.totalReviews}
                      star={star}
                    />
                    <span className="text-sm text-gray-500">
                      {(reviewData.distribution[star] || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Write a Review Section */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Review this product
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share your thoughts with other customers
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-colors"
                >
                  Write a review
                </button>
              </div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2 pl-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

              {reviewData.reviews.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-center">
                  There are no reviews yet. Be the first!
                </div>
              ) : (
                <div className="space-y-6">
                  {reviewData.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center mb-2 space-x-3">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-gray-500">
                          on {review.date || 'N/A'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {review.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        by {review.userName || 'Anonymous'}
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        {review.content}
                      </p>
                    </div>
                  ))}
                  {reviewData.reviews.length > 3 && (
                    <button className="text-blue-600 hover:underline mt-4">
                      View all {reviewData.totalReviews} reviews
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;