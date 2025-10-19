import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password too long" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

const emailLoginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72, { message: "Password too long" }),
});

const phoneLoginSchema = z.object({
  phone: z.string().trim().min(10, { message: "Invalid phone number" }).max(20, { message: "Phone number too long" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72, { message: "Password too long" }),
});

const emailSignupSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: passwordSchema,
  username: z.string().trim().min(1, { message: "Username is required" }).max(16, { message: "Username must be 16 characters or less" }).regex(/^[a-zA-Z0-9_.]+$/, { message: "Username can only contain letters, numbers, underscores, and periods" }),
  displayName: z.string().trim().min(1, { message: "Display name is required" }).max(32, { message: "Display name must be 32 characters or less" }),
});

const phoneSignupSchema = z.object({
  phone: z.string().trim().min(10, { message: "Invalid phone number" }).max(20, { message: "Phone number too long" }),
  password: passwordSchema,
  username: z.string().trim().min(1, { message: "Username is required" }).max(16, { message: "Username must be 16 characters or less" }).regex(/^[a-zA-Z0-9_.]+$/, { message: "Username can only contain letters, numbers, underscores, and periods" }),
  displayName: z.string().trim().min(1, { message: "Display name is required" }).max(32, { message: "Display name must be 32 characters or less" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        let userId: string | undefined;
        if (authMethod === "email") {
          const validatedData = emailLoginSchema.parse({ email, password });
          const { data, error } = await supabase.auth.signInWithPassword({
            email: validatedData.email,
            password: validatedData.password,
          });
          if (error) throw error;
          userId = data.user?.id;
        } else {
          const validatedData = phoneLoginSchema.parse({ phone, password });
          const { data, error } = await supabase.auth.signInWithPassword({
            phone: validatedData.phone,
            password: validatedData.password,
          });
          if (error) throw error;
          userId = data.user?.id;
        }

        // Check if user is suspended
        if (userId) {
          const { data: suspensionData } = await supabase
            .from('user_suspensions')
            .select('reason, is_permanent, expires_at')
            .eq('user_id', userId)
            .maybeSingle();

          if (suspensionData) {
            await supabase.auth.signOut();
            
            if (suspensionData.is_permanent) {
              throw new Error(`Your account has been permanently suspended.\n\nReason: ${suspensionData.reason || 'No reason provided'}\n\nPlease contact support if you believe this is a mistake.`);
            } else if (suspensionData.expires_at) {
              const expiryDate = new Date(suspensionData.expires_at);
              const now = new Date();
              
              if (expiryDate > now) {
                const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                throw new Error(`Your account is suspended until ${expiryDate.toLocaleDateString()}.\n\nReason: ${suspensionData.reason || 'No reason provided'}\n\nTime remaining: ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
              }
            }
          }
        }

        toast.success("Welcome back!");
        navigate("/");
      } else {
        if (authMethod === "email") {
          const validatedData = emailSignupSchema.parse({ email, password, username, displayName });
          const { error } = await supabase.auth.signUp({
            email: validatedData.email,
            password: validatedData.password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                username: validatedData.username,
                display_name: validatedData.displayName,
              },
            },
          });
          if (error) throw error;
        } else {
          const validatedData = phoneSignupSchema.parse({ phone, password, username, displayName });
          const { error } = await supabase.auth.signUp({
            phone: validatedData.phone,
            password: validatedData.password,
            options: {
              data: {
                username: validatedData.username,
                display_name: validatedData.displayName,
              },
            },
          });
          if (error) throw error;
        }
        toast.success("Account created! Welcome to Blaze!");
        navigate("/");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message?.includes("profiles_username_unique")) {
        toast.error("Username already taken. Please choose another one.");
      } else {
        toast.error(error.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl font-bold text-center">
            {isLogin ? "Welcome back to Blaze" : "Join Blaze"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "Enter your credentials to sign in"
              : "Enter your information to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={16}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 16 characters. Letters, numbers, underscores, and periods only.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={32}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 32 characters
                  </p>
                </div>
              </>
            )}
            {authMethod === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          {!isLogin && (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
