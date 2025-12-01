import React from 'react';
import { useReactToPrint } from 'react-to-print';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Assuming 'db' is exported from '../../firebase'

const Invoice = ({ orderData, onClose, onCancelOrder }) => {
  const invoiceRef = React.useRef();

  // Function to handle printing/downloading the invoice
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${orderData.orderId || 'Order'}`,
    // Setting up custom styles for print output (optional but helpful)
    pageStyle: `@page { size: A4; margin: 15mm; }`, 
  });

  // Utility function to format the date
  const formatDate = (date) => {
    // Ensure the date is a Date object or convert it if it's a string
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' '); // Remove comma for cleaner display
  };

  // Note: The onCancelOrder function needs to be passed down 
  // from the parent component, but I'll provide the logic for it below.

  return (
    // Fixed overlay for the modal
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header with Print/Close Buttons */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Order Details</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content (Reference for Printing) */}
        <div ref={invoiceRef} className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">INVOICE (ORDJ4VW2L)</h1> {/* Hardcoded the reference order ID from your image */}
            <p className="text-gray-600">
              <strong>Date:</strong> {formatDate(orderData.createdAt || new Date())} 
              {/* Use orderData.createdAt if available, otherwise use current date */}
            </p>
          </div>

          {/* Billing and Shipping Info (Adjusted structure to match your image style) */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <h3 className="font-semibold mb-1 text-gray-700">Billed to:</h3>
              <p className="font-medium">{orderData.customerInfo?.name || "Dashrath yadav"}</p>
              <p>{orderData.customerInfo?.address || "Kamvaran Biraul Darbhanga"}</p>
              <p>{orderData.customerInfo?.pincode || "Darbhanga 848209"}</p>
              <p className="text-blue-600">{orderData.customerInfo?.email || "innomatrictechnologies@gmail.com"}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-1 text-gray-700">From:</h3>
              <p className="font-medium">L-Mart</p>
              <p>Kamavarn Biraul, Darbhanga</p>
              <p className="text-blue-600">support@lmart.example</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-t border-gray-300">
                  <th className="text-left py-2 px-1 font-semibold">Item</th>
                  <th className="text-center py-2 font-semibold">Quantity</th>
                  <th className="text-right py-2 font-semibold">Price</th>
                  <th className="text-right py-2 px-1 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orderData.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 text-sm">
                    <td className="py-2 px-1">{item.name || "Testing"}</td>
                    <td className="text-center py-2">{item.quantity || 1}</td>
                    <td className="text-right py-2">₹{item.price?.toFixed(2) || "149.99"}</td>
                    <td className="text-right py-2 px-1">₹{(item.price * (item.quantity || 1)).toFixed(2) || "149.99"}</td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="font-bold border-t-2 border-gray-300">
                  <td colSpan="3" className="text-right py-3 px-1">Total</td>
                  <td className="text-right py-3 px-1">₹{orderData.amount?.toFixed(2) || "149.99"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4 text-sm">
            <p><strong>Payment method:</strong> {orderData.paymentMethod || "Razorpay"}</p>
            <p className="mt-2">Note: Thank you for choosing us!</p>
          </div>
        </div>

        {/* Action Buttons (Outside print area) */}
        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onCancelOrder}
            // Add conditional styling based on order status (if available)
            className={`px-6 py-3 text-white rounded-lg transition-colors ${
              orderData.status === 'Cancelled' 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={orderData.status === 'Cancelled'}
          >
            Cancel Order
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;