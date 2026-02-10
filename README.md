# 💰 Envelope Buddy

Application de gestion budgétaire par enveloppes, conçue pour les foyers souhaitant suivre leurs dépenses, revenus et objectifs d'épargne de manière collaborative.

---

## 🚀 Fonctionnalités

### Gestion des enveloppes
- Créer, modifier et supprimer des enveloppes budgétaires
- Allouer des fonds mensuels à chaque enveloppe
- Transférer des fonds entre enveloppes
- Report automatique des soldes d'un mois à l'autre (optionnel par enveloppe)
- Réorganisation par glisser-déposer (drag & drop)
- Codes couleur et icônes personnalisables

### Suivi des dépenses
- Ajout rapide de dépenses avec catégorisation automatique (IA)
- Scan de tickets de caisse via appareil photo (reconnaissance IA)
- Galerie de tickets avec visionneuse plein écran
- Notes et commerçant associés à chaque transaction
- Édition et suppression des transactions

### Revenus
- Ajout de revenus avec description et date
- Historique des revenus par mois
- Calcul automatique du « reste à budgéter »

### Dépenses récurrentes
- Planification de dépenses récurrentes (hebdomadaire, bimensuel, mensuel, trimestriel, annuel)
- Notification des échéances à payer
- Application automatique ou manuelle des récurrences

### Épargne
- Objectifs d'épargne liés à des enveloppes dédiées (icône tirelire)
- Suivi de progression avec barre visuelle
- Date cible optionnelle

### Foyer collaboratif
- Création de foyer avec code d'invitation
- Partage des enveloppes, revenus et dépenses entre membres
- Changement de foyer via le sélecteur
- Journal d'activité partagé

### Liste de courses
- Liste de courses collaborative
- Estimation des prix et lien avec les enveloppes
- Suggestions basées sur l'historique d'achats (IA)
- Archivage des listes

### Export & rapports
- Export PDF mensuel avec mise en page professionnelle
- Résumé des revenus, dépenses, enveloppes et transactions

### Intelligence artificielle
- Suggestions de budget basées sur l'historique
- Catégorisation automatique des dépenses
- Création d'enveloppes suggérées par l'IA
- Scan et extraction de tickets de caisse

---

## 🏗️ Architecture technique

### Stack
| Technologie | Usage |
|---|---|
| **React 18** | Interface utilisateur |
| **TypeScript** | Typage statique |
| **Vite** | Build & dev server |
| **Tailwind CSS** | Styling utilitaire |
| **shadcn/ui** | Composants UI (Radix + Tailwind) |
| **Lovable Cloud** | Backend (base de données, authentification, stockage, fonctions serverless) |
| **TanStack Query** | Gestion du cache et des requêtes |
| **React Router** | Navigation SPA |
| **jsPDF** | Génération de rapports PDF |
| **dnd-kit** | Drag & drop des enveloppes |
| **Recharts** | Graphiques |
| **Framer Motion (vaul)** | Animations drawer |

### Base de données

| Table | Description |
|---|---|
| `households` | Foyers avec code d'invitation |
| `household_members` | Membres d'un foyer |
| `profiles` | Profils utilisateurs (nom d'affichage) |
| `envelopes` | Enveloppes budgétaires |
| `envelope_allocations` | Allocations mensuelles par enveloppe |
| `monthly_budgets` | Budget mensuel (reste à budgéter) |
| `transactions` | Dépenses |
| `incomes` | Revenus |
| `recurring_transactions` | Dépenses récurrentes planifiées |
| `receipts` | Tickets de caisse (métadonnées) |
| `receipt_items` | Articles détaillés d'un ticket |
| `savings_goals` | Objectifs d'épargne |
| `shopping_list` | Liste de courses |
| `shopping_list_archives` | Archives des listes |
| `activity_log` | Journal d'activité du foyer |

### Fonctions backend (Edge Functions)

| Fonction | Description |
|---|---|
| `categorize-expense` | Catégorise une dépense via IA |
| `scan-receipt` | Extrait les données d'un ticket de caisse |
| `suggest-budget` | Suggère des allocations budgétaires |
| `suggest-shopping-items` | Suggère des articles pour la liste de courses |
| `update-user-display-name` | Met à jour le nom d'affichage |

---

## 📁 Structure des fichiers

```
src/
├── components/
│   ├── budget/              # Composants métier budget
│   │   ├── BudgetHeader.tsx          # En-tête avec résumé financier
│   │   ├── EnvelopeGrid.tsx          # Grille des enveloppes
│   │   ├── EnvelopeCard.tsx          # Carte d'enveloppe
│   │   ├── AddExpenseDrawer.tsx      # Drawer ajout dépense
│   │   ├── AddIncomeDialog.tsx       # Dialog ajout revenu
│   │   ├── CreateEnvelopeDialog.tsx  # Dialog création enveloppe
│   │   ├── AllocateFundsDialog.tsx   # Dialog allocation de fonds
│   │   ├── TransferFundsDialog.tsx   # Dialog transfert entre enveloppes
│   │   ├── EnvelopeDetailsDialog.tsx # Détails d'une enveloppe
│   │   ├── SavingsDetailsDialog.tsx  # Détails objectif épargne
│   │   ├── RecurringListSheet.tsx    # Liste des récurrents
│   │   ├── RecurringFormDialog.tsx   # Formulaire récurrent
│   │   ├── ShoppingListSheet.tsx     # Liste de courses
│   │   ├── SettingsSheet.tsx         # Paramètres
│   │   ├── FabButton.tsx             # Bouton flottant (FAB)
│   │   ├── MonthSelector.tsx         # Sélecteur de mois
│   │   ├── PullToRefresh.tsx         # Pull-to-refresh mobile
│   │   ├── ReceiptGallery.tsx        # Galerie de tickets
│   │   ├── ReceiptLightbox.tsx       # Visionneuse ticket
│   │   ├── MultiReceiptUploader.tsx  # Upload multiple de tickets
│   │   ├── AIEnvelopeCreator.tsx     # Création d'enveloppes IA
│   │   ├── AISuggestionsCard.tsx     # Suggestions IA
│   │   └── ...
│   ├── ui/                  # Composants UI génériques (shadcn)
│   ├── BottomNav.tsx        # Navigation mobile bas de page
│   ├── NavLink.tsx          # Lien de navigation
│   ├── ProtectedLayout.tsx  # Layout avec auth requise
│   └── ProtectedRoute.tsx   # Route protégée
├── contexts/
│   ├── AuthContext.tsx       # Contexte d'authentification
│   └── BudgetContext.tsx     # Contexte budget (state principal)
├── hooks/
│   ├── useAI.ts             # Hook appels IA
│   ├── useAISuggestions.ts  # Hook suggestions IA
│   ├── useActivity.ts       # Hook journal d'activité
│   ├── useHousehold.ts      # Hook gestion foyer
│   ├── useReceiptScanner.ts # Hook scan de tickets
│   ├── useReceipts.ts       # Hook gestion tickets
│   ├── useRecurring.ts      # Hook récurrents
│   ├── useSavingsGoals.ts   # Hook objectifs épargne
│   ├── useShoppingList.ts   # Hook liste de courses
│   └── usePlanningData.ts   # Hook données planification
├── lib/
│   ├── budgetDb.ts          # Requêtes DB budget
│   ├── householdDb.ts       # Requêtes DB foyer
│   ├── activityDb.ts        # Requêtes DB activité
│   ├── receiptsDb.ts        # Requêtes DB tickets
│   ├── receiptItemsDb.ts    # Requêtes DB articles ticket
│   ├── receiptStorage.ts    # Stockage fichiers tickets
│   ├── recurringDb.ts       # Requêtes DB récurrents
│   ├── savingsGoalsDb.ts    # Requêtes DB épargne
│   ├── shoppingListDb.ts    # Requêtes DB liste courses
│   ├── exportPdf.ts         # Génération rapport PDF
│   ├── backendClient.ts     # Client API backend
│   └── utils.ts             # Utilitaires
├── pages/
│   ├── Index.tsx            # Page principale (budget)
│   ├── Auth.tsx             # Page connexion/inscription
│   ├── Expenses.tsx         # Page historique dépenses
│   ├── Planning.tsx         # Page planification
│   ├── Recurring.tsx        # Page dépenses récurrentes
│   ├── Settings.tsx         # Page paramètres
│   ├── Shopping.tsx         # Page liste de courses
│   └── NotFound.tsx         # Page 404
├── integrations/
│   └── supabase/
│       ├── client.ts        # Client Supabase (auto-généré)
│       └── types.ts         # Types DB (auto-généré)
└── index.css                # Styles globaux & tokens design
supabase/
└── functions/               # Edge Functions (backend serverless)
    ├── categorize-expense/
    ├── scan-receipt/
    ├── suggest-budget/
    ├── suggest-shopping-items/
    └── update-user-display-name/
```

---

## 📱 Navigation

| Onglet | Page | Description |
|---|---|---|
| 🏠 Budget | `/` | Vue principale avec enveloppes et résumé |
| 📊 Dépenses | `/expenses` | Historique des transactions |
| 📋 Planifier | `/planning` | Vue planification mensuelle |
| 🔄 Récurrents | `/recurring` | Gestion des dépenses récurrentes |
| 🛒 Courses | `/shopping` | Liste de courses collaborative |

---

## 🔐 Sécurité

- Authentification par email/mot de passe
- Vérification d'email obligatoire
- Row Level Security (RLS) sur toutes les tables
- Données isolées par foyer (`household_id`)
- Tokens JWT pour les appels API

---

## 🌐 Déploiement

L'application est hébergée sur **Lovable Cloud** avec :
- Build automatique à chaque modification
- Backend géré (base de données, auth, stockage)
- URL de preview et URL de production
- HTTPS par défaut

---

## 📄 Licence

Projet privé — Tous droits réservés.
