import React, { useState } from "react";

interface AuthFormProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export default function AuthForm({ onSuccess, onClose }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    surveyorId: "",
    targetState: "Maharashtra",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const switchMode = (loginState: boolean) => {
    setIsLogin(loginState);
    setServerError("");
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[e.target.name];
        return updated;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.email) errs.email = "Email is required";
    if (!formData.password) errs.password = "Password is required";
    if (!isLogin) {
      if (!formData.fullName) errs.fullName = "Name is required";
      if (!formData.surveyorId) errs.surveyorId = "ID is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setServerError("");
    setIsSubmitting(true);

    try {
      await new Promise((res) => setTimeout(res, 400));
      const user = {
        name:
          formData.fullName || (isLogin ? "Authorized Surveyor" : "Surveyor"),
        email: formData.email,
        role: "SURVEYOR",
        surveyorId: formData.surveyorId || "SUR-2026",
        targetState: formData.targetState,
      };

      localStorage.setItem("bhumap_user", JSON.stringify(user));
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111814] text-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-white/60 hover:text-white font-bold text-lg transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          ✕
        </button>
      )}

      <div className="flex bg-[#1a261f] p-1.5 rounded-2xl mb-6 border border-white/5">
        <button
          type="button"
          onClick={() => switchMode(true)}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${isLogin ? "bg-white text-[#111814] shadow-md" : "text-white/60 hover:text-white"}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchMode(false)}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${!isLogin ? "bg-white text-[#111814] shadow-md" : "text-white/60 hover:text-white"}`}
        >
          Register
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-2xl font-bold tracking-tight text-white">
          {isLogin ? "Surveyor Portal Login" : "Register Cadastral Profile"}
        </h3>
        <p className="text-[13px] text-white/60 mt-1 font-medium leading-relaxed">
          {isLogin
            ? "Access your GIS parcel workspace."
            : "Request access to the BhuMap platform."}
        </p>
      </div>

      {serverError && (
        <div className="bg-red-900/20 text-red-400 p-3 rounded-xl text-[13px] font-medium mb-5 border border-red-900/30">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <>
            <div>
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Full Name
              </label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full mt-1.5 bg-[#1a261f] text-white px-4 py-3 rounded-xl border border-white/10 focus:border-[#5b8c69] focus:outline-none transition-all text-xs font-medium"
                placeholder="e.g. Anil Kumar"
              />
              {errors.fullName && (
                <p className="text-red-400 text-[11px] mt-1 font-medium">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                  Surveyor ID
                </label>
                <input
                  name="surveyorId"
                  value={formData.surveyorId}
                  onChange={handleChange}
                  className="w-full mt-1.5 bg-[#1a261f] text-white px-4 py-3 rounded-xl border border-white/10 focus:border-[#5b8c69] focus:outline-none transition-all text-xs font-medium"
                  placeholder="SUR-2026"
                />
                {errors.surveyorId && (
                  <p className="text-red-400 text-[11px] mt-1 font-medium">
                    {errors.surveyorId}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                  Target State
                </label>
                <select
                  name="targetState"
                  value={formData.targetState}
                  onChange={handleChange}
                  className="w-full mt-1.5 bg-[#1a261f] text-white px-3 py-3 rounded-xl border border-white/10 focus:border-[#5b8c69] focus:outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="National">National (DILRMP)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
            Official Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full mt-1.5 bg-[#1a261f] text-white px-4 py-3 rounded-xl border border-white/10 focus:border-[#5b8c69] focus:outline-none transition-all text-xs font-medium"
            placeholder="surveyor@state.gov.in"
          />
          {errors.email && (
            <p className="text-red-400 text-[11px] mt-1 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full mt-1.5 bg-[#1a261f] text-white px-4 py-3 rounded-xl border border-white/10 focus:border-[#5b8c69] focus:outline-none transition-all text-xs font-medium"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-red-400 text-[11px] mt-1 font-medium">
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#5b8c69] text-white font-bold py-3.5 rounded-xl hover:bg-[#4a7258] transition-all mt-3 disabled:opacity-70 shadow-lg cursor-pointer text-xs flex items-center justify-center gap-2"
        >
          {isSubmitting
            ? "Processing..."
            : isLogin
              ? "Secure Login"
              : "Submit Registration"}
        </button>
      </form>
    </div>
  );
}
