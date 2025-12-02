// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartNotification from './components/CartNotification';
import LoginModal from './components/LoginModal';

import Home from './Pages/Home';
import Printing from './Pages/Printing';
import EMarket from './Pages/EMarket';
import LocalMarket from './Pages/LocalMarket';
import NewsToday from './Pages/NewsToday';
import AdminLogin from './Pages/AdminLogin';
import AdminDashboard from './Pages/AdminDashboard';
import UserLogin from './Pages/UserLogin';
import UserRegister from './Pages/UserRegister';
import Cart from './Pages/Cart';
import Checkout from './Pages/Checkout';
import OrderSuccess from './Pages/OrderSuccess';
import TermsOfService from './Pages/TermsOfService';
import Privacy from './Pages/Privacy';
import Cookie from './Pages/Cookie';
import FileDownloads from './Pages/FileDownloads';
import ProductDetail from './Pages/ProductDetail';
import Contact from './Pages/Contact';
import NotFound from './Pages/NotFound';
import Invoice from './Pages/Invoice';

// ✅ Add this import so the footer link /return-policy works
import ReturnPolicy from './components/ReturnPolicy';
import ShippingPolicy from './components/ShippingPolicy';
import TermsConditions from './components/TermsConditions';
import ChatWithUs from './components/ChatWithUs';
import FAQs from './components/FAQs';

const App = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
        localStorage.setItem('hasVisitedBefore', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseModal = () => setShowLoginModal(false);

  return (
    <OrderProvider>
      <CartProvider>
        <Router>
          <Routes>
            {/* ADMIN ROUTES */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* USER ROUTES (shell with Navbar/Footer) */}
            <Route
              path="/*"
              element={
                <div className="min-h-screen bg-white flex flex-col">
                  <Navbar />
                  <CartNotification />
                  <LoginModal isOpen={showLoginModal} onClose={handleCloseModal} />

                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/printing" element={<Printing />} />
                      <Route path="/e-market" element={<EMarket />} />
                      <Route path="/local-market" element={<LocalMarket />} />
                      <Route path="/news-today" element={<NewsToday />} />

                      <Route path="/login" element={<UserLogin />} />
                      <Route path="/register" element={<UserRegister />} />

                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/order-success" element={<OrderSuccess />} />

                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/cookie" element={<Cookie />} />
                      <Route path="/file-downloads" element={<FileDownloads />} />
                      <Route path="/contact" element={<Contact />} />

                      {/* PRODUCT PAGE */}
                      <Route path="/product/:productId" element={<ProductDetail />} />

                      {/* INVOICE PAGE */}
                      <Route path="/invoice" element={<Invoice />} />

                      {/* ✅ RETURN POLICY PAGE */}
                      <Route path="/return-policy" element={<ReturnPolicy />} />
                      <Route path="/shipping-policy" element={<ShippingPolicy/>} />
                      <Route path="/terms-conditions" element={<TermsConditions/>} />
                      <Route path="/chat-with-us" element={<ChatWithUs/>} />
                      <Route path="/faqs" element={<FAQs/>} />

                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>

                  <Footer />
                </div>
              }
            />
          </Routes>
        </Router>
      </CartProvider>
    </OrderProvider>
  );
};

export default App;
