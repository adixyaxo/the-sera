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
import { Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';

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
  { text: "Focus", x: "5%", y: "8%", size: "5rem", delay: 0, opacity: 0.03 },
  { text: "Clarity", x: "72%", y: "10%", size: "3.5rem", delay: 0.2, opacity: 0.025 },
  { text: "Discipline", x: "12%", y: "32%", size: "4rem", delay: 0.4, opacity: 0.03 },
  { text: "Systems", x: "68%", y: "42%", size: "3rem", delay: 0.6, opacity: 0.02 },
  { text: "Progress", x: "6%", y: "62%", size: "3.5rem", delay: 0.8, opacity: 0.025 },
  { text: "Consistency", x: "58%", y: "72%", size: "3rem", delay: 1, opacity: 0.02 },
  { text: "Growth", x: "22%", y: "82%", size: "4rem", delay: 1.2, opacity: 0.03 },
  { text: "SERA", x: "78%", y: "85%", size: "2.5rem", delay: 1.4, opacity: 0.025 },
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
      {/* Subtle gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orb - top left */}
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent) / 0.08), transparent 60%)",
            left: "-20%",
            top: "-30%",
            filter: "blur(60px)",
          }}
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Secondary gradient orb - bottom right */}
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.06), transparent 60%)",
            right: "-15%",
            bottom: "-20%",
            filter: "blur(50px)",
          }}
          animate={{ 
            scale: [1.1, 1, 1.1],
            x: [0, -20, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Accent gradient orb - center */}
        <motion.div 
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(225 90% 72% / 0.05), transparent 70%)",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            filter: "blur(40px)",
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Animated background words - very subtle */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {inspirationalWords.map((word, index) => (
          <motion.div
            key={word.text}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(12px)" }}
            animate={{ 
              opacity: word.opacity, 
              scale: 1, 
              filter: "blur(6px)",
            }}
            transition={{ 
              duration: 2, 
              delay: word.delay,
              ease: "easeOut"
            }}
            className="absolute font-extralight text-foreground/80 whitespace-nowrap"
            style={{
              left: word.x,
              top: word.y,
              fontSize: word.size,
            }}
          >
            <motion.span
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{ 
                duration: 18 + index * 3, 
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

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="glass-strong border-border/20 shadow-2xl backdrop-blur-2xl">
          <CardHeader className="text-center pb-2">
            {/* Enhanced Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2, duration: 0.8 }}
              className="mx-auto mb-4 relative"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent via-primary to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20 relative overflow-hidden">
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                <Sparkles className="w-8 h-8 text-white relative z-10" />
                
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
              </div>
              
              {/* Glow ring */}
              <motion.div
                className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-accent/50 to-primary/50 blur-lg -z-10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            
            <CardTitle className="text-2xl font-light tracking-tight">Welcome to SERA</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your intelligent productivity assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-muted/50 h-11">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-sm"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-sm"
                >
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
                        className="rounded-2xl h-12 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20 transition-all placeholder:text-muted-foreground/50"
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
                        className="rounded-2xl h-12 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20 transition-all pr-12 placeholder:text-muted-foreground/50"
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
                      className="w-full rounded-full h-12 bg-gradient-to-r from-accent to-primary hover:opacity-90 text-accent-foreground font-medium shadow-lg shadow-accent/20 transition-all" 
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
                        className="rounded-2xl h-12 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20 transition-all placeholder:text-muted-foreground/50"
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
                        className="rounded-2xl h-12 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20 transition-all placeholder:text-muted-foreground/50"
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
                        className="rounded-2xl h-12 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20 transition-all pr-12 placeholder:text-muted-foreground/50"
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
                      className="w-full rounded-full h-12 bg-gradient-to-r from-accent to-primary hover:opacity-90 text-accent-foreground font-medium shadow-lg shadow-accent/20 transition-all" 
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
