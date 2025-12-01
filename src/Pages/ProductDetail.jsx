import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase"; // Assuming 'db' is correctly exported from your firebase config
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
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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

// --- START: Write Review Modal Component (Updated) ---

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
                                    className={`w-8 h-8 cursor-pointer transition-colors ${
                                        index < rating ? 'text-yellow-500' : 'text-gray-300'
                                    }`} 
                                    fill="currentColor" 
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
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
                        className={`w-full font-semibold py-3 rounded-lg transition-colors flex items-center justify-center ${
                            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'
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
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [fullImageList, setFullImageList] = useState([]); 
  
  const [showReviewModal, setShowReviewModal] = useState(false); 
  
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
  // ------------------------------------

  // Utility function: Fetch image URL from Storage (used in dependencies)
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
            // For optimal performance, add an index in Firestore for: 
            // collection: reviews, fields: productId (ASC), createdAt (DESC)
        );

        const querySnapshot = await getDocs(q);
        const fetchedReviews = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamp to a readable date string
            date: doc.data().createdAt?.toDate().toLocaleDateString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric' }),
            // Keep the raw createdAt for sorting consistency
            createdAt: doc.data().createdAt 
        }));

        setReviewData(calculateReviewData(fetchedReviews));
    } catch (error) {
        console.error("Error fetching product reviews:", error);
    }
  }, [productId]);


  // --- FIREBASE REVIEW SUBMITTER ---
  const handleSubmitReview = async ({ rating, title, content }) => {
    // NOTE: In a real app, 'userId' and 'userName' should be retrieved from your Firebase Auth context.
    const mockUserId = "USER_" + Math.random().toString(36).substring(2, 9);
    const mockUserName = "Authenticated User"; 

    const newReview = {
        productId,
        rating,
        title,
        content,
        userId: mockUserId,
        userName: mockUserName,
        createdAt: serverTimestamp(), // Use server timestamp for accurate ordering
    };

    try {
        await addDoc(collection(db, "reviews"), newReview);
        // SUCCESS: Re-fetch all reviews to update the UI (this is the "refresh")
        await fetchReviews(); 
        return true;
    } catch (error) {
        console.error("Error adding review document:", error);
        return false;
    }
  };


  // Utility functions (Unchanged except for fetchImageURL moved to useCallback above)
  const detectCategory = () => {
    if (productFromState?.category) return productFromState.category;
    if (location.pathname.includes('local')) return 'localmarket';
    if (location.pathname.includes('print')) return 'printing';
    return 'emarket';
  };
  
  const mapPrices = (data) => {
    let finalPrice = data.price || 0;
    let finalOriginalPrice = data.originalPrice || 0;

    if (data.offerPrice !== undefined && data.offerPrice < finalPrice) {
        finalPrice = data.offerPrice;
        finalOriginalPrice = data.price;
    } else if (data.offerPrice !== undefined && data.offerPrice >= finalPrice) {
        finalOriginalPrice = data.originalPrice || data.price;
        finalPrice = data.price;
    } else {
        finalPrice = data.price || 0;
        finalOriginalPrice = data.originalPrice || 0;
    }

    return { price: finalPrice, originalPrice: finalOriginalPrice };
  };
  
  // Handler functions (Wrapped in useCallback)
  const handleColorChange = useCallback(async (color) => {
    setSelectedColor(color);
    
    if (product) {
        const lowerCaseColor = color.toLowerCase();
        let newImageUrl = null;
        const colorImagePath = product.colorImageMap ? product.colorImageMap[color] : null;
        
        if (colorImagePath) {
            if (colorImagePath.startsWith('http')) {
              newImageUrl = colorImagePath; 
            } else {
              newImageUrl = await fetchImageURL(colorImagePath); 
            }
        } 
        else if (Array.isArray(product.imageUrls)) {
            const targetImage = product.imageUrls.find(img => 
                img.url && img.name && img.name.toLowerCase().includes(lowerCaseColor)
            );
            if (targetImage) {
                newImageUrl = targetImage.url;
            }
        }
        if (newImageUrl) {
            setCurrentMainImage(newImageUrl);
            const newIndex = fullImageList.findIndex(url => url === newImageUrl);
            setSelectedImageIndex(newIndex !== -1 ? newIndex : 0); 
        } else {
             // Revert to main image/index 0 if the selected color doesn't have an associated image
             setCurrentMainImage(product.mainImage);
             setSelectedImageIndex(0); 
        }
    }
  }, [product, fullImageList, fetchImageURL]);

  // Main data fetching effect
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        let finalData = null;
        const fallbackImageUrl = 'https://via.placeholder.com/400x300?text=No+Image';

        // --- Product data fetching logic (from previous turns) ---
        
        if (productFromState) {
            const prices = mapPrices(productFromState);
            finalData = {
              ...productFromState,
              mainImage: productFromState.mainImage || productFromState.image || (Array.isArray(productFromState.imageUrls) && productFromState.imageUrls[0]?.url) || fallbackImageUrl, 
              galleryImages: productFromState.galleryImages || (Array.isArray(productFromState.imageUrls) && productFromState.imageUrls.slice(1).map(i => i.url)) || [],
              colors: productFromState.colors || productFromState.colorVariants || [], 
              sizes: productFromState.sizes || productFromState.sizeVariants || [], 
              materials: productFromState.materials || [],
              productDetails: productFromState.productDetails || {},
              features: productFromState.features || [],
              description: productFromState.description || "",
              price: prices.price, 
              originalPrice: prices.originalPrice, 
              colorImageMap: productFromState.colorImageMap || {}, 
              inStock: productFromState.inStock !== undefined ? productFromState.inStock : true,
              ratings: productFromState.ratings || 0,
              reviews: productFromState.reviews || 0,
              coupons: productFromState.coupons || [],
              sizeChart: productFromState.sizeChart || null,
              displayBrand: productFromState.displaybrand || "", 
              imageUrls: productFromState.imageUrls || [],
            };
          } else {
            // Firestore Fetch logic
            const productRef = doc(db, "products", productId);
            const snap = await getDoc(productRef);
  
            if (snap.exists()) {
              const data = snap.data();
              const prices = mapPrices(data);
              
              let mainImg = fallbackImageUrl;
              let galleryImgs = [];
  
              if (data.mainImagePath) {
                mainImg = await fetchImageURL(data.mainImagePath);
              } else if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
                mainImg = data.imageUrls[0].url || fallbackImageUrl;
                galleryImgs = data.imageUrls.slice(1).map(i => i.url).filter(Boolean);
              } else if (data.image) {
                mainImg = data.image;
              }
  
              if (data.gallery?.length > 0) {
                for (let p of data.gallery) {
                  const url = await fetchImageURL(p);
                  if (url) galleryImgs.push(url);
                }
              }
  
              finalData = {
                ...data,
                id: snap.id,
                mainImage: mainImg,
                galleryImages: galleryImgs,
                colors: data.colors || data.colorVariants || [],
                sizes: data.sizes || data.sizeVariants || [],
                materials: data.materials || [],
                productDetails: data.productDetails || {},
                features: data.features || [],
                description: data.description || "",
                price: prices.price, 
                originalPrice: prices.originalPrice, 
                colorImageMap: data.colorImageMap || {},
                inStock: data.inStock !== undefined ? data.inStock : true,
                ratings: data.ratings || 0,
                reviews: data.reviews || 0,
                coupons: data.coupons || [],
                sizeChart: data.sizeChart || null,
                displayBrand: data.displaybrand || "", 
                imageUrls: data.imageUrls || [],
              };
            }
          }
        // --- End Product data fetching logic ---

        setProduct(finalData);

        if (finalData) {
            // Image list generation
            let initialImages = [];
            // Prioritize color-specific images
            const colorImages = Object.values(finalData.colorImageMap || {}).filter(url => url && url.startsWith('http'));
            initialImages.push(...colorImages);
            // Add other gallery images
            const galleryImages = finalData.galleryImages || [];
            initialImages.push(...galleryImages);
            // Ensure main image is first if not already in the list
            if (finalData.mainImage && !initialImages.includes(finalData.mainImage)) {
                 initialImages.unshift(finalData.mainImage); 
            }
            // Create a unique list of images
            const uniqueFullList = Array.from(new Set(initialImages.filter(Boolean)));
            setFullImageList(uniqueFullList);

            setCurrentMainImage(finalData.mainImage); 
            setSelectedColor(finalData.colors[0] || '');
            setSelectedSize(finalData.sizes[0] || '');
            setSelectedMaterial(finalData.materials[0] || '');
            
            const initialIndex = uniqueFullList.findIndex(url => url === finalData.mainImage);
            setSelectedImageIndex(initialIndex !== -1 ? initialIndex : 0);
            
            // Fetch reviews immediately after successful product fetch
            fetchReviews();
        }

      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId, productFromState, fetchReviews, fetchImageURL]);

  // ***** KEY FEATURE IMPLEMENTATION *****
  // Image synchronization effect: Updates the color button on the right 
  // when a user clicks a thumbnail on the left.
  useEffect(() => {
    if (product && fullImageList.length > 0) {
      const currentImageURL = fullImageList[selectedImageIndex];
      let foundColor = '';

      // 1. Check if the current image is mapped to a color variant
      if (product.colorImageMap) {
        for (const color in product.colorImageMap) {
          if (product.colorImageMap[color] === currentImageURL) {
            foundColor = color;
            break;
          }
        }
      }

      // 2. If a color is found and it's different from the currently selected one, 
      //    update the color state to highlight the correct button.
      if (foundColor && foundColor !== selectedColor) {
        setSelectedColor(foundColor);
      } 
      
      // 3. Update the main image view to match the selected index.
      setCurrentMainImage(currentImageURL);
    }
  }, [selectedImageIndex, fullImageList, product, selectedColor]); // selectedImageIndex is the trigger
  // *************************************
  
  const handleAddToCart = async () => { 
    if (!product || !product.inStock) return;
    setAddingToCart(true);
    try {
      const imageForCart = fullImageList[selectedImageIndex] || currentMainImage; 
      const selectedProduct = {
        id: product.id, name: product.name, price: product.price, originalPrice: product.originalPrice,
        quantity, selectedColor, selectedSize, selectedMaterial, image: imageForCart,
        description: product.description, colors: product.colors || [], sizes: product.sizes || [], materials: product.materials || []
      };
      addToCart(selectedProduct);
      setTimeout(() => { setAddingToCart(false); }, 1000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => { 
    if (!product) return;
    const imageForCart = fullImageList[selectedImageIndex] || currentMainImage; 
    const selectedProduct = {
        id: product.id, name: product.name, price: product.price, originalPrice: product.originalPrice,
        quantity, selectedColor, selectedSize, selectedMaterial, image: imageForCart,
        description: product.description, colors: product.colors || [], sizes: product.sizes || [], materials: product.materials || []
    };
    addToCart(selectedProduct);
    setTimeout(() => { navigate("/checkout"); }, 500);
  };

  const incrementQuantity = () => setQuantity((p) => p + 1);
  const decrementQuantity = () => setQuantity((p) => (p > 1 ? p - 1 : 1));

  const getBackButtonPath = () => {
    const category = detectCategory();
    switch(category) {
      case 'localmarket': return '/local-market';
      case 'printing': return '/printing';
      default: return '/e-market';
    }
  };

  const getCategoryName = () => {
    const category = detectCategory();
    switch(category) {
      case 'localmarket': return 'Local Market';
      case 'printing': return 'Printing Services';
      default: return 'E-Market';
    }
  };

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

  const allImages = fullImageList; 
  const discountPercentage = product.originalPrice > product.price 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      {/* Conditionally render the modal */}
      {showReviewModal && product && (
        <WriteReviewModal 
          onClose={() => setShowReviewModal(false)} 
          onSubmit={handleSubmitReview} // Calls the Firebase submission function
          productName={product.name}
        />
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
                  src={allImages[selectedImageIndex] || 'https://via.placeholder.com/400x300?text=Image+Loading+Error'}
                  alt={product.name}
                  className="w-full h-80 object-cover"
                />
              </div>

              {allImages.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      // Clicking this updates selectedImageIndex, which triggers the useEffect
                      onClick={() => setSelectedImageIndex(index)} 
                      className={`bg-gray-100 rounded-lg overflow-hidden border transition-all ${
                        selectedImageIndex === index 
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
                {product.displayBrand && (
                    <p className="text-sm font-semibold text-purple-600 uppercase mb-1">{product.displayBrand}</p>
                )}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                
                {/* Ratings and Reviews - Uses LIVE reviewData STATE */}
                <div className="flex items-center space-x-4 mb-3">
                  {reviewData.averageRating > 0 && (
                      <div className="flex items-center bg-green-600 text-white px-2 py-1 rounded text-sm">
                        <span className="font-bold">{reviewData.averageRating.toFixed(1)}</span>
                        <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      </div>
                  )}
                  <span className="text-blue-600 font-medium text-sm">{reviewData.totalReviews.toLocaleString()} ratings</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600 font-medium text-sm">{reviewData.totalReviews.toLocaleString()} reviews</span>
                </div>

                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                  product.inStock 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                
                <div className="space-y-2">
                    {product.features?.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {feature}
                      </div>
                    ))}
                </div>

                {/* Color Selection (Right Side Button) */}
                {product.colors && product.colors.length > 0 && (
                    <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {detectCategory() === 'localmarket' ? 'Variant' : 'Color'}: <span className="text-purple-600">
                        {selectedColor.startsWith('#') ? 'Selected' : selectedColor}
                        </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {product.colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => handleColorChange(color)} 
                            // selectedColor state is what controls this class
                            className={`px-3 py-1 rounded border font-medium text-sm transition-all ${
                            selectedColor === color
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                            // Inline style for hex colors
                            style={color.startsWith('#') ? {backgroundColor: color, color: '#fff'} : {}}
                        >
                            {color.startsWith('#') ? '●' : color}
                        </button>
                        ))}
                    </div>
                    </div>
                )}

                {/* Price Section */}
                <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-900">
                        ₹{product.price}
                    </span>
                    {product.originalPrice > product.price && (
                        <>
                        <span className="text-lg text-gray-500 line-through">
                            ₹{product.originalPrice}
                        </span>
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                            {discountPercentage}% off
                        </span>
                        </>
                    )}
                    </div>
                </div>

                {/* Size Selection */}
                {product.sizes && product.sizes.length > 0 && (
                    <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                        Size: <span className="text-purple-600">{selectedSize}</span>
                        </h3>
                        {product.sizeChart && (
                        <button className="text-blue-600 text-sm hover:underline">Size Chart</button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => (
                        <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-3 py-2 rounded border font-medium text-sm transition-all ${
                            selectedSize === size
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            {size}
                        </button>
                        ))}
                    </div>
                    </div>
                )}

                {/* Material Selection */}
                {product.materials && product.materials.length > 0 && (
                    <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Material: <span className="text-purple-600">{selectedMaterial}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {product.materials.map((material) => (
                        <button
                            key={material}
                            onClick={() => setSelectedMaterial(material)}
                            className={`px-3 py-2 rounded border font-medium text-sm transition-all ${
                            selectedMaterial === material
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            {material}
                        </button>
                        ))}
                    </div>
                    </div>
                )}

                {/* Product Details Table */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Product details</h3>
                    <div className="space-y-2 text-sm">
                    {product.productDetails && Object.entries(product.productDetails).map(([key, value]) => (
                        <div key={key} className="flex">
                        <span className="w-1/3 text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        <span className="w-2/3 text-gray-900">{value}</span>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Coupons and Offers */}
                {product.coupons && product.coupons.length > 0 && (
                    <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Offers for you</h3>
                    <div className="space-y-2">
                        {product.coupons.map((coupon, index) => (
                        <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold mt-1">
                                {coupon.title}
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700">{coupon.description}</p>
                                <span className="text-blue-600 text-xs font-medium">{coupon.terms}</span>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* Quantity Selector, Action Buttons, Additional Info (Unchanged) */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                    <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                    <button onClick={decrementQuantity} className="px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-l-lg transition-colors">-</button>
                    <span className="px-4 py-1 border-x border-gray-300 font-medium min-w-8 text-center">{quantity}</span>
                    <button onClick={incrementQuantity} className="px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-r-lg transition-colors">+</button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock || addingToCart}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${
                        product.inStock && !addingToCart
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    >
                    {addingToCart ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Adding...</>
                    ) : (
                        product.inStock ? 'Add to Cart' : 'Out of Stock'
                    )}
                    </button>

                    <button
                    onClick={handleBuyNow}
                    disabled={!product.inStock}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        product.inStock
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    >
                    Buy Now
                    </button>
                </div>

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

        {/* --- RATINGS AND REVIEWS SECTION (Dynamically updated by fetchReviews) --- */}
        <div className="bg-white rounded-xl shadow-sm border mt-6 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Ratings Overview (Left Column) */}
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
                                </span
>
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
                        {/* Button opens the modal which submits to Firebase and refreshes the view */}
                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-colors"
                        >
                            Write a review
                        </button>
                    </div>
                </div>
                
                {/* 2. Reviews List (Right Column) */}
                <div className="lg:col-span-2 pl-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
                    
                    {reviewData.reviews.length === 0 ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-center">
                            There are no reviews yet. Be the first!
                        </div>
                    ) : (
                        // List of Reviews
                        <div className="space-y-6">
                            {/* Display up to 3 newest reviews */}
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
        {/* --- END RATINGS AND REVIEWS SECTION --- */}

      </div>
    </div>
  );
};

export default ProductDetail;