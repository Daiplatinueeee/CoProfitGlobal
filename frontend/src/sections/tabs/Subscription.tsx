import { useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

function Subscription() {
  const [formData, setFormData] = useState({
    paymentMethod: "gcash",
    referenceNumber: "",
    notes: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setUploadSuccess] = useState(false);

  const subscriptions = [
    {
      name: "Bronze",
      color: "from-amber-50 to-amber-100",
      borderColor: "border-amber-300",
      features: [
        { label: "Direct Referral", value: "₱100.00" },
        { label: "Indirect Referral", value: "₱5.00" },
        { label: "Pairing Value", value: "₱400.00" },
        { label: "Max Pairs/Day", value: "6" },
        { label: "Points Value", value: "1.00" },
      ],
    },
    {
      name: "Silver",
      color: "from-slate-50 to-slate-100",
      borderColor: "border-slate-300",
      features: [
        { label: "Direct Referral", value: "₱300.00" },
        { label: "Indirect Referral", value: "₱15.00" },
        { label: "Pairing Value", value: "₱400.00" },
        { label: "Max Pairs/Day", value: "32" },
        { label: "Points Value", value: "3.00" },
      ],
    },
    {
      name: "Gold",
      color: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-400",
      features: [
        { label: "Direct Referral", value: "₱500.00" },
        { label: "Indirect Referral", value: "₱25.00" },
        { label: "Pairing Value", value: "₱400.00" },
        { label: "Max Pairs/Day", value: "60" },
        { label: "Points Value", value: "5.00" },
      ],
    },
    {
      name: "Platinum",
      color: "from-blue-50 to-blue-100",
      borderColor: "border-blue-400",
      features: [
        { label: "Direct Referral", value: "₱700.00" },
        { label: "Indirect Referral", value: "₱35.00" },
        { label: "Pairing Value", value: "₱400.00" },
        { label: "Max Pairs/Day", value: "100" },
        { label: "Points Value", value: "7.00" },
      ],
    },
  ];

  const paymentMethods = [
    {
      id: "gcash",
      name: "GCash",
      account: "09XX-XXXX-XXX",
      icon: "💳",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      account: "XX-XXXXXX-XXXX",
      icon: "🏦",
    },
    {
      id: "paymaya",
      name: "PayMaya",
      account: "XXXX-XXXX-XXXX-XXXX",
      icon: "💰",
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Payment submitted:", formData);
  };

  return (
    <div className="w-full min-h-screen bg-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Available Subscriptions
        </h1>
        <p className="text-lg text-slate-600">
          Choose the perfect subscription that suits your needs
        </p>
      </div>

      {/* Packages Grid */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subscriptions.map((pkg) => (
            <div
              key={pkg.name}
              className={`bg-linear-to-br ${pkg.color} border-2 ${pkg.borderColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow`}
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {pkg.name}
              </h3>

              <div className="space-y-4">
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {feature.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {feature.value}
                    </span>
                  </div>
                ))}
              </div>

              <button className="w-full mt-8 bg-slate-900 text-white py-2 rounded-lg font-semibold hover:bg-slate-800 transition-colors">
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Complete Your Payment
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Payment Method Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-4">
                Select Payment Method
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((method) => (
                  <div key={method.id}>
                    <input
                      type="radio"
                      id={method.id}
                      name="paymentMethod"
                      value={method.id}
                      checked={formData.paymentMethod === method.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor={method.id}
                      className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.paymentMethod === method.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-semibold text-slate-900">
                          {method.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{method.account}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label
                htmlFor="referenceNumber"
                className="block text-sm font-semibold text-slate-900 mb-2"
              >
                Reference / Transaction Number
              </label>
              <input
                type="text"
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                placeholder="Enter your reference number"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-4">
                Upload Payment Proof
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="fileInput"
                />
                <label
                  htmlFor="fileInput"
                  className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Upload className="mx-auto mb-3 text-slate-400" size={32} />
                  <p className="font-semibold text-slate-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-slate-500">PNG, JPG, PDF up to 10MB</p>
                </label>
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-green-600">
                    <CheckCircle size={20} />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes/Instructions */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-slate-900 mb-2"
              >
                Additional Notes or Instructions
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information for payment processing..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-blue-600" />
                Payment Instructions
              </h3>
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">📱 GCash:</p>
                  <p>Send payment to: 09XX-XXXX-XXX</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">🏦 Bank Transfer:</p>
                  <p>Account Number: XX-XXXXXX-XXXX</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">💰 PayMaya:</p>
                  <p>Account Number: XXXX-XXXX-XXXX-XXXX</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold text-lg hover:shadow-lg transition-all hover:from-blue-700 hover:to-blue-800"
            >
              Submit Payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Subscription;