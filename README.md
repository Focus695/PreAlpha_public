![PreAlpha](https://img.shields.io/badge/PreAlpha-Prediction%20Market%20Analysis-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![Bun](https://img.shields.io/badge/Bun-1.3+-black?logo=bun)

# PreAlpha

**Track the top 1% of smart money in prediction markets — analyze deeply and follow continuously**

PreAlpha identifies addresses with "pricing power" on prediction markets like Polymarket and Opinion. Track smart money movements and analyze trading patterns to get execution-level alpha signals.

🌐 **Visit**: [https://prealpha.trade](https://prealpha.trade)

## Features

- **Smart Money Leaderboard** - Track top performing addresses ranked by smart score
- **Signal Feed** - Real-time trading signals from smart money addresses
- **Address Analysis** - Deep dive into any wallet's performance metrics and trading history
- **Multi-Market Support** - Polymarket and Opinion markets coverage
- **SIWE Authentication** - Secure Sign-In with Ethereum integration

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **Runtime**: Bun (package manager & bundler)
- **Web3**: RainbowKit + Wagmi + SIWE (Sign-In with Ethereum)
- **Router**: React Router DOM

## Quick Start

### Prerequisites

Install Bun (required package manager and runtime):

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Focus695/PreAlpha_public.git
cd PreAlpha_public

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and set your API_BASE_URL and WALLETCONNECT_PROJECT_ID

# Start development server
bun dev
```

The application will be available at `http://localhost:3000`

## Configuration

Required environment variables in `.env`:

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend API base URL |
| `WALLETCONNECT_PROJECT_ID` | Get your project ID from https://cloud.walletconnect.com |
| `WEB_PORT` | Development server port (default: 3000) |
| `NODE_ENV` | Environment mode (development/production) |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/         # Base UI components
│   ├── layout/     # Layout components (Header, Modal)
│   ├── leaderboard/  # Leaderboard components
│   ├── signals/     # Signal feed components
│   └── address-detail/  # Address detail components
├── pages/          # Route pages
│   ├── SmartMoneyPage.tsx
│   ├── AddressDetailPage.tsx
│   ├── SignalsPage.tsx
│   └── MarketPage.tsx
├── hooks/          # Custom React hooks
│   ├── use-leaderboard.ts
│   ├── use-signals.ts
│   └── use-address-profile.ts
├── lib/            # Utilities and API client
│   ├── api-client.ts
│   ├── api-config.ts
│   └── translations.ts
├── types/          # TypeScript type definitions
└── styles/         # CSS styles (TailwindCSS)
```

## Available Scripts

```bash
bun dev            # Start development server
bun build          # Build for production
bun preview        # Preview production build
bun test           # Run tests
bun lint           # ESLint check
bun format         # Format code with Prettier
bun type-check     # TypeScript type checking
```

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## Links

- **Website**: [https://prealpha.trade](https://prealpha.trade)
- **GitHub**: [https://github.com/Focus695/PreAlpha_public](https://github.com/Focus695/PreAlpha_public)

## Acknowledgments

- Built with [React](https://react.dev/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Web3 integration via [RainbowKit](https://www.rainbowkit.com/) and [Wagmi](https://wagmi.sh/)
