import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, BarChart3, Users, HandHeart, Clock, Sparkles } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-beauty-gray to-soft-pink">
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-rose-gold to-deep-rose rounded-lg flex items-center justify-center">
              <Gem className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-charcoal">BeautyCRM</h1>
              <p className="text-sm text-gray-500">Sales Excellence Platform</p>
            </div>
          </div>
          <Button 
            onClick={handleLogin}
            className="bg-gradient-to-r from-rose-gold to-deep-rose text-white hover:shadow-md transition-shadow"
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-charcoal mb-6">
              Elevate Your Beauty Business
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The ultimate CRM solution designed specifically for beauty industry professionals. 
              Manage clients, track deals, and boost your sales with AI-powered insights.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-rose-gold to-deep-rose text-white px-8 py-3 text-lg hover:shadow-lg transition-shadow"
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-charcoal">Client Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Organize your beauty clients with detailed profiles, interaction history, 
                  and personalized service tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-rose-gold/20 rounded-lg flex items-center justify-center mb-4">
                  <HandHeart className="w-6 h-6 text-deep-rose" />
                </div>
                <CardTitle className="text-charcoal">Deal Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visual kanban boards to track your beauty service deals from 
                  initial consultation to successful closure.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-charcoal">Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive dashboards and KPIs to measure your sales performance 
                  and identify growth opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-charcoal">AI-Powered Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Smart recommendations and lead classification powered by AI 
                  to maximize your conversion rates.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle className="text-charcoal">Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automatic time tracking and productivity monitoring to 
                  optimize your work efficiency and manage your team.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-sm">IG</span>
                  </div>
                </div>
                <CardTitle className="text-charcoal">Social Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect Instagram, website forms, and other lead sources to 
                  automatically capture and organize new prospects.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-lg">
            <h3 className="text-3xl font-bold text-charcoal mb-4">
              Ready to Transform Your Beauty Business?
            </h3>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of beauty professionals who trust BeautyCRM to grow their business.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-rose-gold to-deep-rose text-white px-12 py-4 text-lg hover:shadow-lg transition-shadow"
              data-testid="button-start-free-trial"
            >
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500">
            © 2024 BeautyCRM. Designed for beauty industry professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
