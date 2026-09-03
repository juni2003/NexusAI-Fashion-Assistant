"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ShoppingBag,
  Zap,
  MessageSquare,
  ArrowRight,
  Star,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Animation Variants ────────────────────────────────────────────────────────
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

// ── Feature Card Data ─────────────────────────────────────────────────────────
const features = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Smart Recommendations",
    desc: "AI understands your style, budget, and preferences — not just keywords.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Lightning Fast",
    desc: "Powered by Groq's blazing inference — get answers in milliseconds.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: "300+ Products",
    desc: "Browse curated men's and women's fashion with real images and prices.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Instant Support",
    desc: "Ask about returns, shipping, sizing — get accurate answers instantly.",
    color: "from-pink-500 to-rose-600",
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = [
  { value: "300+", label: "Fashion Products", icon: <ShoppingBag className="w-5 h-5" /> },
  { value: "<1s", label: "Response Time", icon: <Zap className="w-5 h-5" /> },
  { value: "24/7", label: "Always Available", icon: <Shield className="w-5 h-5" /> },
  { value: "3-Way", label: "AI Router", icon: <TrendingUp className="w-5 h-5" /> },
];

// ── Page Component ────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] animated-gradient" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[100px] animated-gradient" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 w-full z-50 glass-strong"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Nexus<span className="gradient-text">AI</span>
            </span>
          </div>
          <Link href="/chat">
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-full px-6 gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25">
              Try NexusAI
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text Side (~60%) */}
          <motion.div
            className="flex-1 lg:max-w-[60%] space-y-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-violet-300 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Fashion Assistant
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight"
            >
              Your Style.{" "}
              <span className="gradient-text">Elevated</span> by{" "}
              <span className="gradient-text-warm">Intelligence.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed"
            >
              NexusAI understands what you&apos;re looking for — not just keywords.
              Ask for &quot;something for a summer party under $20&quot; and watch
              the magic happen.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
              <Link href="/chat">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-full px-8 py-6 text-lg gap-3 pulse-glow transition-all duration-300"
                >
                  <MessageSquare className="w-5 h-5" />
                  Start Shopping with AI
                </Button>
              </Link>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 py-6 text-lg border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all duration-300"
                >
                  Learn More
                </Button>
              </a>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap gap-6 pt-4"
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg glass flex items-center justify-center text-violet-400">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{stat.value}</p>
                    <p className="text-slate-500 text-xs">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Image Side (~40%) */}
          <motion.div
            className="flex-shrink-0 w-full lg:w-[38%] relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative">
              {/* Main Image */}
              <div className="relative rounded-2xl overflow-hidden glow-purple float">
                <Image
                  src="/fashion-hero-1.jpg"
                  alt="Premium fashion — haute couture dress in deep purple tones"
                  width={500}
                  height={667}
                  className="w-full h-auto object-cover rounded-2xl"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>


            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeInUp}
              className="text-violet-400 font-medium mb-3 tracking-wider uppercase text-sm"
            >
              Why NexusAI?
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
            >
              Not Your Average{" "}
              <span className="gradient-text">Chatbot</span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-slate-400 max-w-2xl mx-auto text-lg"
            >
              Built with semantic search, intelligent routing, and real-time streaming
              — NexusAI doesn&apos;t just match words, it understands meaning.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="group glass rounded-2xl p-6 card-lift cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Fashion Gallery Section ─────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeInUp}
              className="text-violet-400 font-medium mb-3 tracking-wider uppercase text-sm"
            >
              Curated Collection
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
            >
              Fashion Meets <span className="gradient-text-warm">AI</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {[
              {
                src: "/fashion-hero-1.jpg",
                alt: "Haute couture purple dress — women's fashion",
                label: "Women's Collection",
              },
              {
                src: "/fashion-hero-2.jpg",
                alt: "Modern menswear — streetwear blazer look",
                label: "Men's Streetwear",
              },
              {
                src: "/fashion-hero-3.jpg",
                alt: "Premium fashion accessories flat lay",
                label: "Accessories & More",
              },
            ].map((img, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="group relative rounded-2xl overflow-hidden card-lift"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white font-semibold text-lg">{img.label}</p>
                  <p className="text-slate-300 text-sm mt-1">
                    Explore with NexusAI →
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center glass-strong rounded-3xl p-12 sm:p-16 relative overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          {/* Glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Find Your Perfect Outfit?
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Just tell NexusAI what you&apos;re looking for. It&apos;s like having a
            personal stylist who never sleeps.
          </p>
          <Link href="/chat">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-full px-10 py-6 text-lg gap-3 pulse-glow transition-all duration-300"
            >
              <Sparkles className="w-5 h-5" />
              Try NexusAI Now — It&apos;s Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-slate-400">
              NexusAI — Built by{" "}
              <a 
                href="https://github.com/juni2003" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white font-medium hover:text-indigo-400 transition-colors"
              >
                juni2003
              </a>
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} NexusAI. AI-Powered Fashion Shopping
            Assistant.
          </p>
        </div>
      </footer>
    </main>
  );
}
