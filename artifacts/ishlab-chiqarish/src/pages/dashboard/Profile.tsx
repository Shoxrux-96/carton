import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Lock, Save, ShieldCheck, LogOut, Smartphone, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

export default function Profile() {
  const { t } = useLang();
  const { user, token, logout } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [success, setSuccess] = useState("");
  const [successType, setSuccessType] = useState<"phone" | "password" | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const initials = user?.phone
    ? "O" + user.phone.slice(-2)
    : "AD";

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdScore = getPasswordStrength(newPassword);
  const pwdLabels = ["", t('very_weak'), t('weak_password'), t('medium_password'), t('strong_password'), t('very_strong')];
  const pwdColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  const handleSavePhone = async () => {
    setPhoneError("");
    setSuccess("");
    setSuccessType("");

    if (!phone.trim()) {
      setPhoneError(t('phone_required_error'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await customFetch<{ token?: string; user: { id: number; phone: string } }>("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      localStorage.setItem("user", JSON.stringify(res.user));
      if (res.token) {
        localStorage.setItem("token", res.token);
      }

      setSuccess(t('phone_changed_success'));
      setSuccessType("phone");
    } catch (error: any) {
      setPhoneError(error?.data?.error || t('error_occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError("");
    setSuccess("");
    setSuccessType("");

    if (!currentPassword) {
      setPasswordError(t('enter_current_password'));
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError(t('password_min_8'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwords_not_match'));
      return;
    }

    setIsSaving(true);
    try {
      await customFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t('password_changed_success'));
      setSuccessType("password");
    } catch (error: any) {
      setPasswordError(error?.data?.error || t('error_occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('profile_title')}
        description={t('profile_description')}
      />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile header */}
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative p-8">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20 shadow-xl">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold truncate">Owner</h1>
                  <Badge variant="default" className="bg-primary/15 text-primary hover:bg-primary/20 border-0 text-xs px-3 py-1">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-mono">{user?.phone || "—"}</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Success alert */}
        {success && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-300 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{success}</span>
          </div>
        )}

        {/* Phone number section */}
        <Card className="overflow-hidden border-0 shadow-lg group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary/60 transition-colors" />
          <div className="p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Phone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{t('change_phone')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('change_phone_desc')}
                </p>
              </div>
              {successType === "phone" && (
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="max-w-md space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5 text-foreground/80">
                  {t('phone')}
                </label>
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                  placeholder="+998901234567"
                  error={phoneError}
                  className="h-12 text-base"
                />
              </div>
              <Button
                onClick={handleSavePhone}
                isLoading={isSaving}
                className="rounded-xl h-12 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                <Save className="mr-2 w-4 h-4" /> {t('save')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Password section */}
        <Card className="overflow-hidden border-0 shadow-lg group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30 group-hover:bg-amber-500/60 transition-colors" />
          <div className="p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{t('change_password')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('change_password_desc')}
                </p>
              </div>
              {successType === "password" && (
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="max-w-md space-y-5">
              <div>
                <label className="text-sm font-semibold block mb-1.5 text-foreground/80">
                  {t('current_password')}
                </label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('current_password_placeholder')}
                    className="h-12 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5 text-foreground/80">
                  {t('new_password')}
                </label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('new_password_placeholder')}
                    className="h-12 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            i <= pwdScore ? pwdColors[pwdScore] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      pwdScore <= 2 ? "text-red-500" : pwdScore <= 3 ? "text-amber-500" : "text-emerald-500"
                    }`}>
                      {pwdLabels[pwdScore]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5 text-foreground/80">
                  {t('confirm_password')}
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirm_password_placeholder')}
                    error={passwordError}
                    className="h-12 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-destructive flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {t('passwords_dont_match')}
                  </p>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('passwords_match')}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSavePassword}
                isLoading={isSaving}
                className="rounded-xl h-12 px-8 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0"
              >
                <Lock className="mr-2 w-4 h-4" /> {t('update_password')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-8">
          <AlertCircle className="w-3 h-3" />
          <span>{t('data_secure')}</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
