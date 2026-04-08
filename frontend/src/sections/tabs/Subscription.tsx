import { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Zap, Users, ArrowLeftRight, Calendar, Star } from "lucide-react";

const tierConfig: Record<string, {
  topBg: string;
  topText: string;
  icon: string;
  ring: string;
  pillBg: string;
}> = {
  Bronze: {
    topBg: "bg-amber-500",
    topText: "text-white",
    icon: "🥉",
    ring: "ring-amber-400",
    pillBg: "bg-white/25",
  },
  Silver: {
    topBg: "bg-slate-300",
    topText: "text-slate-900",
    icon: "🥈",
    ring: "ring-slate-400",
    pillBg: "bg-white/40",
  },
  Gold: {
    topBg: "bg-yellow-400",
    topText: "text-yellow-900",
    icon: "🥇",
    ring: "ring-yellow-500",
    pillBg: "bg-white/30",
  },
  Platinum: {
    topBg: "bg-slate-900",
    topText: "text-white",
    icon: "💎",
    ring: "ring-slate-800",
    pillBg: "bg-white/15",
  },
};

const featureIcons: Record<string, React.ReactNode> = {
  "Direct Referral": <Users size={12} />,
  "Indirect Referral": <Users size={12} />,
  "Pairing Value": <ArrowLeftRight size={12} />,
  "Max Pairs/Day": <Calendar size={12} />,
  "Points Value": <Star size={12} />,
};

function Subscription() {
  const [formData, setFormData] = useState({
    paymentMethod: "gcash",
    referenceNumber: "",
    notes: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setUploadSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const subscriptions = [
    {
      name: "Bronze",
      price: "₱1,000",
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
      price: "₱3,000",
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
      price: "₱5,000",
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
      price: "₱7,000",
      isCurrent: true,
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
    { id: "gcash", name: "GCash", account: "09XX-XXXX-XXX", icon: "💳" },
    { id: "bank", name: "Bank Transfer", account: "XX-XXXXXX-XXXX", icon: "🏦" },
    { id: "paymaya", name: "PayMaya", account: "XXXX-XXXX-XXXX-XXXX", icon: "💰" },
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Payment submitted:", formData, "Plan:", selectedPlan);
  };

  const tierStats = [
    { label: "Current Plan", value: "Platinum", sub: "Active subscription" },
    { label: "Max Pairs / Day", value: "100", sub: "Daily pair limit" },
    { label: "Direct Referral", value: "₱700.00", sub: "Per referral earned" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-7xl mx-auto px-21 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your plan and submit payment for upgrades</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {tierStats.map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Plan Cards */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Available Plans</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click a plan to select it for payment</p>
            </div>
            {selectedPlan && (
              <span className="text-xs font-medium bg-slate-900 text-white px-3 py-1 rounded-full">
                {selectedPlan} selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriptions.map((pkg) => {
              const cfg = tierConfig[pkg.name];
              const isSelected = selectedPlan === pkg.name;

              return (
                <div
                  key={pkg.name}
                  onClick={() => !pkg.isCurrent && setSelectedPlan(pkg.name)}
                  className={`
                    relative rounded-2xl overflow-hidden transition-all duration-200 border
                    ${pkg.isCurrent
                      ? "border-slate-200 cursor-default shadow-sm"
                      : isSelected
                      ? `ring-2 ${cfg.ring} border-transparent cursor-pointer shadow-md -translate-y-0.5`
                      : "border-slate-100 cursor-pointer hover:border-slate-200 hover:shadow-sm hover:-translate-y-0.5"
                    }
                  `}
                >
                  {/* Coloured top section */}
                  <div className={`${cfg.topBg} px-5 pt-5 pb-8 relative`}>
                    {/* Decorative circle */}
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 right-6 w-14 h-14 rounded-full bg-white/10" />

                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-3xl">{cfg.icon}</span>
                        {pkg.isCurrent && (
                          <span className={`text-xs font-medium ${cfg.pillBg} ${cfg.topText} px-2.5 py-1 rounded-full`}>
                            Current
                          </span>
                        )}
                        {isSelected && !pkg.isCurrent && (
                          <span className={`text-xs font-medium ${cfg.pillBg} ${cfg.topText} px-2.5 py-1 rounded-full`}>
                            Selected
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${cfg.topText} opacity-80 mb-0.5`}>{pkg.name}</p>
                      <p className={`text-3xl font-bold ${cfg.topText} tracking-tight`}>{pkg.price}</p>
                    </div>
                  </div>

                  {/* White feature body */}
                  <div className="bg-white px-5 pt-5 pb-5 space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 text-slate-300">
                            {featureIcons[feature.label]}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{feature.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 shrink-0 tabular-nums">
                          {feature.value}
                        </span>
                      </div>
                    ))}

                    {/* Divider + action */}
                    <div className="pt-3 mt-1 border-t border-slate-50">
                      {pkg.isCurrent ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle size={13} />
                          <span className="text-xs font-medium">Active plan</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPlan(pkg.name); }}
                          className={`w-full text-xs font-medium py-2 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? "✓ Selected" : "Choose Plan"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Payment Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Submit Payment</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPlan ? `Upgrading to ${selectedPlan}` : "Select a plan above"}
                  </p>
                </div>
                {selectedPlan && <Zap size={14} className="text-slate-400" />}
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Payment Method</label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        htmlFor={method.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          formData.paymentMethod === method.id
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          id={method.id}
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span className="text-base">{method.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{method.name}</p>
                          <p className="text-xs text-slate-400">{method.account}</p>
                        </div>
                        {formData.paymentMethod === method.id && (
                          <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Reference / Transaction No.</label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    placeholder="Enter reference number"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Payment Proof</label>
                  <div className="relative">
                    <input type="file" onChange={handleFileChange} className="sr-only" id="fileInput" />
                    <label
                      htmlFor="fileInput"
                      className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                    >
                      <Upload size={20} className="text-slate-300 mb-1.5" />
                      <p className="text-xs font-medium text-slate-500">Click to upload</p>
                      <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, PDF up to 10MB</p>
                    </label>
                    {selectedFile && (
                      <div className="mt-2 flex items-center gap-2 text-emerald-600">
                        <CheckCircle size={14} />
                        <span className="text-xs font-medium truncate">{selectedFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Instructions or Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent text-slate-900 placeholder-slate-300 resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Submit Payment
                </button>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Payment Instructions</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Send your payment to any of the accounts below</p>
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <AlertCircle size={11} />
                  Important
                </span>
              </div>

              <div className="px-6 py-5 space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`rounded-xl border px-5 py-4 transition-colors ${
                      formData.paymentMethod === method.id
                        ? "border-slate-200 bg-slate-50"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{method.icon}</span>
                      <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Account Number</p>
                    <p className="text-sm font-mono font-medium text-slate-700">{method.account}</p>
                  </div>
                ))}

                <div className="rounded-xl border border-slate-100 px-5 py-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Steps to complete payment</p>
                  <ol className="space-y-2">
                    {[
                      "Select your desired plan from the cards above.",
                      "Choose a payment method and send the exact plan amount.",
                      "Enter the reference/transaction number from your receipt.",
                      "Upload a screenshot or photo of your payment proof.",
                      "Click Submit Payment and wait for confirmation.",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Subscription;