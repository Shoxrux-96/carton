import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Lock, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";

const loginSchema = z.object({
  phone: z.string().min(1, "Telefon raqam kiritilishi shart"),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" }
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await customFetch<{ token: string; user: { id: number; phone: string } }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      window.location.href = "/dashboard";
    } catch (error: any) {
      setError("root", {
        message: error?.data?.error || "Kirishda xatolik yuz berdi",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md z-10"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="text-xl font-bold text-foreground tracking-tight leading-tight">Shovot Carton Paper</div>
            <div className="text-xs text-muted-foreground">shovotcartonpaper.uz</div>
          </div>
        </Link>

        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold font-display mb-2">Xush kelibsiz!</h1>
            <p className="text-muted-foreground">Tizimga kirish uchun telefon va parolni kiriting</p>
          </div>

          {errors.root && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {errors.root.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Telefon raqam</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    {...register("phone")}
                    error={errors.phone?.message}
                    className="pl-11"
                    placeholder="+998901234567"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Parol</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    {...register("password")}
                    error={errors.password?.message}
                    className="pl-11"
                    placeholder="Kamida 8 belgi"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base rounded-xl"
              isLoading={isSubmitting}
            >
              Kirish
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
