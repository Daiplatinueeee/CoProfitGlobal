import React from "react";
import { X } from "lucide-react";

interface OTPModalProps {
  show: boolean;
  onClose: () => void;
  userEmail: string;
  error: string | null;
  otpCode: string;
  setOtpCode: React.Dispatch<React.SetStateAction<string>>;
  handleVerifyOtp: () => void;
  isVerifyingOtp: boolean;
}

const OTPModal: React.FC<OTPModalProps> = ({
  show,
  onClose,
  userEmail,
  error,
  otpCode,
  setOtpCode,
  handleVerifyOtp,
  isVerifyingOtp,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl text-white mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-300 text-sm mb-6">
          Enter the 6-digit code sent to {userEmail}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={(e) =>
              setOtpCode(e.target.value.replace(/\D/g, ""))
            }
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white placeholder-gray-500"
          />
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={isVerifyingOtp || otpCode.length !== 6}
          className="w-full bg-yellow-500/80 hover:bg-yellow-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          {isVerifyingOtp ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Verify OTP"
          )}
        </button>

        <p className="text-center text-gray-400 text-sm mt-4">
          Didn't receive the code?{" "}
          <button className="text-yellow-500 hover:text-yellow-400">
            Resend
          </button>
        </p>
      </div>
    </div>
  );
};

export default OTPModal;