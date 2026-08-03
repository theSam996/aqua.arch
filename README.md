# AquaSole 🌊👟
**Sustainable Insoles from Ocean Algae**

## Project Structure

```
aqua-sole/
│
├── frontend/                  # Static frontend (HTML/CSS/JS)
│   ├── assets/                # Images and media
│   ├── index.html             # Landing page
│   ├── login.html             # Login page
│   ├── signup.html            # Signup page
│   ├── dashboard.html         # User dashboard & cart
│   ├── checkout.html          # Multi-step checkout
│   ├── orders.html            # Order history
│   ├── foot_scan.html         # 3D foot scanning
│   ├── script.js              # Main application logic
│   ├── style.css              # Global styles
│   ├── landing.css            # Landing page styles
│   └── vercel.json            # Vercel deployment config
│
├── backend/                   # Express.js API server
│   ├── server.js              # Main server (Razorpay + Supabase)
│   ├── api/index.js           # Vercel serverless entrypoint
│   ├── package.json           # Node.js dependencies
│   ├── .env                   # Environment variables (git-ignored)
│   ├── .env.example           # Template for environment variables
│   └── supabase_setup.sql     # Database schema setup
│
├── README.md
└── .gitignore
```

## Getting Started

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your Razorpay, Firebase, and Supabase credentials
```

### 3. Setup Supabase Database
Run the SQL from `backend/supabase_setup.sql` in your Supabase SQL Editor.

### 4. Start the Development Server
```bash
cd backend
npm run dev
```

Open **http://localhost:5001** in your browser.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS, Lucide Icons, Firebase Auth
- **Backend**: Node.js, Express.js
- **Payments**: Razorpay
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
