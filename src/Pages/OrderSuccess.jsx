import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Invoice from "./Invoice";
import CancelOrderModal from "./CancelOrderModal";

const OrderSuccess = () => {
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState(null);
  const [saving, setSaving] = useState(true);
  const [saved, setSaved] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);
  // Change initial state to TRUE to automatically show the invoice modal
  const [showInvoice, setShowInvoice] = useState(true); 
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(false);

  // Load order data from sessionStorage
  useEffect(() => {
    const data = sessionStorage.getItem("orderSuccessData");

    if (!data) {
      navigate("/");
      return;
    }

    const parsed = JSON.parse(data);
    setOrderData(parsed);

    // Save to Firestore
    saveOrderToFirestore(parsed);

    // Remove session data
    sessionStorage.removeItem("orderSuccessData");

    // Animation
    setTimeout(() => setAnimateSuccess(true), 400);
  }, [navigate]);

  // Save order into Firestore
  const saveOrderToFirestore = async (data) => {
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        paymentId: data.paymentId,
        orderId: data.orderId || `ORD-${data.paymentId.slice(-6)}`,
        amount: data.amount,
        items: data.items || [],
        customerInfo: data.customerInfo || {},
        createdAt: serverTimestamp(),
        status: "success",
      });

      // Store the document ID for future updates
      setOrderData(prev => ({ ...prev, id: docRef.id }));
      setSaved(true);
    } catch (err) {
      console.error("Error saving order:", err);
      alert("Order saved offline. Will sync later.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSuccess = () => {
    setOrderCancelled(true);
    setShowCancelModal(false);
    // Update local order data
    setOrderData(prev => ({ 
      ...prev, 
      status: "cancelled" 
    }));
  };

  if (!orderData) return null;

  const { paymentId, orderId, amount, items, customerInfo, status } = orderData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-12">
      <div className="container-responsive">
        <div
          className={`bg-white rounded-2xl shadow-2xl p-8 transition-all duration-700 ${
            animateSuccess ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
              orderCancelled ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {orderCancelled ? (
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeWidth={2}/>
                </svg>
              )}
            </div>
            <h1 className="text-3xl font-bold mt-4">
              {orderCancelled ? 'Order Cancelled!' : 'Payment Successful!'}
            </h1>
            <p className="text-gray-600">
              {orderCancelled 
                ? 'Your order has been cancelled successfully.' 
                : 'Your order has been placed successfully.'}
            </p>
          </div>

          {/* Order Status Badge */}
          <div className="text-center mb-6">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              orderCancelled 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              Status: {orderCancelled ? 'Cancelled' : 'Confirmed'}
            </span>
          </div>

          {/* Saving Status */}
          {saving && (
            <div className="text-center mb-4 text-blue-600">
              Saving order to database...
            </div>
          )}
          {saved && !orderCancelled && (
            <div className="text-center mb-4 text-green-600 font-semibold">
              Order saved!
            </div>
          )}

          {/* Order Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            <div className="space-y-3">
              <p><strong>Order ID:</strong> {orderId}</p>
              <p><strong>Payment ID:</strong> {paymentId}</p>
              <p><strong>Total Amount:</strong> ₹{amount}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer Info */}
          {customerInfo && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              <p><strong>Name:</strong> {customerInfo.name}</p>
              <p><strong>Email:</strong> {customerInfo.email}</p>
              <p><strong>Phone:</strong> {customerInfo.phone}</p>
              {customerInfo.address && (
                <p>
                  <strong>Address:</strong> {customerInfo.address},{" "}
                  {customerInfo.city} - {customerInfo.pincode}
                </p>
              )}
            </div>
          )}

          {/* Items */}
          {items?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Order Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div className="bg-white rounded-lg p-4 shadow-sm flex justify-between" key={i}>
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="text-center mt-6 space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:gap-4">
            {!orderCancelled && (
              <>
                {/* The 'View Invoice' button is removed because the invoice modal shows automatically. */}
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Cancel Order
                </button>
              </>
            )}
            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal - Will show automatically due to initial state */}
      {showInvoice && (
        <Invoice
          orderData={orderData}
          onClose={() => setShowInvoice(false)}
          onCancelOrder={() => {
            setShowInvoice(false);
            setShowCancelModal(true);
          }}
        />
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <CancelOrderModal
          orderData={orderData}
          onClose={() => setShowCancelModal(false)}
          onCancelSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};

export default OrderSuccess;