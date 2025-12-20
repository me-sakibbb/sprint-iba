import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Leaderboard from "@/components/Leaderboard";
import CommunityPosts from "@/components/CommunityPosts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">
        <Hero />
        <div id="features">
          <Features />
        </div>
        <div id="leaderboard">
          <Leaderboard />
        </div>
        <div id="community">
          <CommunityPosts />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
