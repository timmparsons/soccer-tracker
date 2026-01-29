# ⚽ Master Touch

A React Native soccer juggling training app that helps young players practice consistently outside of team training. Built for coaches and their teams.

## 🎯 Why Master Touch?

Most youth soccer players only get 4 hours of coached training per week. Master Touch gamifies daily juggling practice to keep kids motivated and improving between sessions. Coaches get tools to track team progress and engagement.

---

## ✨ Features

### For Players

- ⏱️ **Training Timer** – Practice juggling with built-in timer and counter
- 📊 **Progress Charts** – Visualize your improvement over time
- 🏆 **Team Levels** – Work together with teammates to level up (500 XP per level)
- 🎮 **XP System** – Earn 1 XP for every 10 juggles
- 🤖 **AI Coaching** – Get personalized feedback powered by Claude
- 🔔 **Push Notifications** – Daily reminders to practice

### For Coaches

- 👥 **Team Management** – Create teams and invite players with auto-generated codes
- 📈 **Team Analytics** – Track engagement and progress across your roster
- 👀 **Player Insights** – Monitor individual development

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo) with Expo Router
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Language:** TypeScript
- **Data Fetching:** React Query
- **Charts:** Victory Native
- **Icons:** Lucide React Native
- **AI:** Anthropic Claude API (via Supabase Edge Functions)
- **Deployment:** EAS Build

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Expo CLI
- Supabase account

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/master-touch.git
cd master-touch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase URL and anon key

# Start development server
npx expo start
```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in `/supabase/migrations`
3. Set up Edge Functions for AI coaching
4. Configure authentication providers (email/password)
5. Add your environment variables to `.env`

---

## 📱 App Structure

```
app/
├── (auth)/          # Authentication screens
├── (tabs)/          # Main app tabs
│   ├── index.tsx    # Home/Training
│   ├── progress.tsx # Progress charts
│   └── profile.tsx  # User profile
└── team/            # Team management
```

---

## 🎮 XP & Leveling

- **XP Ratio:** 10 juggles = 1 XP
- **Team Levels:** 500 XP required per level
- **Progress:** Exponential curve keeps it challenging long-term

---

## 🧪 Current Status

In active testing with youth soccer team. Gathering feedback from young players to refine UX and gamification mechanics.

---

## 📄 License

[Your chosen license]

---

## 🙏 Acknowledgments

Built with insights from real soccer coaches and players. Special thanks to the test team for honest feedback that makes this better every day.
