import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const inspirationalWords = [
  { text: "Focus", x: "5%", y: "8%", size: "6rem", delay: 0 },
  { text: "Clarity", x: "70%", y: "12%", size: "4rem", delay: 0.2 },
  { text: "Discipline", x: "15%", y: "35%", size: "5rem", delay: 0.4 },
  { text: "Systems", x: "65%", y: "45%", size: "3.5rem", delay: 0.6 },
  { text: "Progress", x: "8%", y: "65%", size: "4.5rem", delay: 0.8 },
  { text: "Consistency", x: "55%", y: "75%", size: "4rem", delay: 1 },
  { text: "Growth", x: "25%", y: "85%", size: "5rem", delay: 1.2 },
  { text: "SERA", x: "80%", y: "88%", size: "3rem", delay: 1.4 },
];

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signUpSchema.safeParse({ email, password, fullName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Animated background words */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {inspirationalWords.map((word, index) => (
          <motion.div
            key={word.text}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ 
              opacity: 0.04, 
              scale: 1, 
              filter: "blur(4px)",
            }}
            transition={{ 
              duration: 1.5, 
              delay: word.delay,
              ease: "easeOut"
            }}
            className="absolute font-light text-foreground whitespace-nowrap"
            style={{
              left: word.x,
              top: word.y,
              fontSize: word.size,
            }}
          >
            <motion.span
              animate={{ 
                y: [0, -10, 0],
                rotate: [-0.5, 0.5, -0.5]
              }}
              transition={{ 
                duration: 15 + index * 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block"
            >
              {word.text}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent) / 0.3), transparent 70%)",
            left: "-10%",
            top: "-20%",
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
            right: "-15%",
            bottom: "-10%",
          }}
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="glass-strong border-border/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center"
            >
              <span className="text-2xl font-bold text-accent">S</span>
            </motion.div>
            <CardTitle className="text-2xl font-light tracking-tight">Welcome to SERA</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your intelligent AI-powered routine assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-muted/50">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="signin" key="signin" className="mt-6">
                  <motion.form 
                    onSubmit={handleSignIn} 
                    className="space-y-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-accent transition-colors"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-accent transition-colors pr-12"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full rounded-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-lg shadow-accent/20" 
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="signup" key="signup" className="mt-6">
                  <motion.form 
                    onSubmit={handleSignUp} 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-accent transition-colors"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-accent transition-colors"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-accent transition-colors pr-12"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full rounded-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-lg shadow-accent/20" 
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By continuing, you agree to our Terms of Service
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="fixed bottom-2 right-2 text-[0.5rem] text-muted-foreground/50 select-none z-50">
        made by aditya
      </div>
    </div>
  );
};

export default Auth;