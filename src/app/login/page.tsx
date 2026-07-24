"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ArrowRight, MonitorPlay, PlaneTakeoff, School } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("login.errorInvalid"));
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // Dashboard resolves the actual redirect server-side via
        // getServerSession + role, which is more secure than deciding here.
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("login.errorGeneric"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-12 flex-col justify-between overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex items-center gap-2">
          <MonitorPlay className="w-7 h-7" />
          <span className="text-xl font-extrabold tracking-tight">{t("login.brand")}</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight text-balance">
            {t("login.welcome")}
          </h1>
          <p className="text-blue-100 text-lg max-w-sm">{t("login.subtitle")}</p>
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <School className="w-5 h-5 text-blue-200" />
              <span className="text-sm font-medium">Schools</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <PlaneTakeoff className="w-5 h-5 text-blue-200" />
              <span className="text-sm font-medium">Airports</span>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-blue-200">{t("login.footer")}</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex justify-between items-center p-6 lg:justify-end">
          <div className="lg:hidden flex items-center gap-2 text-gray-900">
            <MonitorPlay className="w-6 h-6 text-blue-600" />
            <span className="font-extrabold">{t("login.brand")}</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <h1 className="text-2xl font-bold text-gray-900">{t("login.welcome")}</h1>
              <p className="text-gray-500 mt-1 text-sm">{t("login.tagline")}</p>
            </div>
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{t("login.tagline")}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  {t("login.emailLabel")}
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 bg-white"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder={t("login.emailPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  {t("login.passwordLabel")}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 bg-white"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder={t("login.passwordPlaceholder")}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? t("login.signingIn") : t("login.signIn")}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
