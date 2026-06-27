# 🧺 Bale Bazaar

> Inventory & Catalog Management for Panipat's Used Clothing Trade

---

## What is this?

**Bale Bazaar** is a mobile-first PWA built for used clothing businesses in Panipat. It helps manage bale/lot inventory, upload photos & videos of stock, and broadcast catalogs to parties (buyers).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite |
| Auth | Firebase (Google OAuth) |
| Database | Firebase Firestore |
| Media Storage | Firebase Storage |
| Routing | Custom (same pattern as mandi-khata) |
| Hosting | Vercel (recommended) |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/RitikGarg7/bale-bazaar.git
cd bale-bazaar
npm install
```

### 2. Firebase setup

- Create project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable **Authentication → Google**
- Enable **Firestore Database**
- Enable **Storage**

```bash
cp .env.example .env
# Fill in your Firebase config values
```

### 3. Run

```bash
npm run dev
```

---

## Folder Structure

```
src/
├── components/     # Shared UI (design system tokens + primitives)
├── context/        # AppContext — global state, CRUD operations
├── hooks/          # Custom hooks
├── lib/            # Firebase init + DB helpers
├── screens/        # Route-level screens (Login, Home, Inventory…)
└── services/       # Business logic services
```

---

## Planned Modules

- [x] Google Login / Logout
- [x] Dashboard (stats + module nav)
- [x] Inventory screen (boilerplate)
- [x] Catalog screen (boilerplate)
- [x] Parties screen (boilerplate)
- [ ] Add/Edit Bale (category, weight, grade, price, photos)
- [ ] Catalog broadcast — shareable link for parties
- [ ] Order tracking
- [ ] Payment ledger

---

Built with ❤️ for Panipat's used clothing trade 🏭
