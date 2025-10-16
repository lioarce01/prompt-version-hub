import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, GitBranch, TestTube, Rocket, BarChart3, Github } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: GitBranch,
      title: "Version Control",
      description:
        "Git-style versioning for your prompts. Track changes, compare versions, and rollback instantly.",
    },
    {
      icon: TestTube,
      title: "A/B Testing",
      description:
        "Run deterministic experiments. Test prompt variations with confidence and data-driven decisions.",
    },
    {
      icon: Rocket,
      title: "Multi-Environment Deploy",
      description:
        "Deploy to dev, staging, and production. Full deployment history and instant rollbacks.",
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description:
        "Track success rates, latency, and costs. Make informed decisions with real metrics.",
    },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(193,100%,50%,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(0,0%,10%)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0,0%,10%)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Prompt Version Hub</h1>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground cursor-pointer">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 md:py-32 lg:py-40">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
          <Badge variant="secondary" className="mb-4 bg-secondary/50 text-foreground border border-border/50 backdrop-blur-sm">
            Open Source
          </Badge>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight">
            Version, Test, and Deploy
            <br />
            <span className="bg-gradient-to-r from-accent via-purple-500 to-accent bg-clip-text text-transparent animate-glow-pulse">
              AI Prompts with Confidence
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Manage your AI prompts like code. Git-style versioning, deterministic
            A/B testing, and multi-environment deployments in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="/register">
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-border/50 hover:bg-secondary/50 backdrop-blur-sm text-foreground hover:text-foreground cursor-pointer">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground">Everything you need</h3>
            <p className="text-muted-foreground text-lg md:text-xl">
              Built for teams who ship AI products
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="bg-card/50 border-border/50 hover:border-accent/50 transition-all duration-300 backdrop-blur-sm hover:shadow-lg hover:shadow-accent/10 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                    <feature.icon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-24 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground">Simple workflow</h3>
            <p className="text-muted-foreground text-lg md:text-xl">
              From prompt to production in minutes
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                number: "1",
                title: "Create & Version",
                description: "Write your prompt with variables. Every change creates a new version with full history."
              },
              {
                number: "2",
                title: "Test Variations",
                description: "Run A/B tests with deterministic assignments. Same user always gets the same version."
              },
              {
                number: "3",
                title: "Deploy & Monitor",
                description: "Deploy to dev, staging, or production. Track usage, costs, and performance in real-time."
              }
            ].map((step) => (
              <div key={step.number} className="flex gap-6 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center text-lg font-bold text-foreground group-hover:bg-accent/10 group-hover:border-accent/50 transition-all">
                  {step.number}
                </div>
                <div className="pt-1">
                  <h4 className="font-semibold text-xl mb-2 text-foreground">{step.title}</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent/10 via-purple-500/10 to-accent/10 border border-accent/20 p-12 md:p-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(193,100%,50%,0.1),transparent_70%)]" />
            <div className="relative space-y-6">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Ready to get started?</h3>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join teams managing their AI prompts with confidence
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground">
              © 2025 Prompt Version Hub. Built with React & FastAPI.
            </p>
            <div className="flex gap-8 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
