Top! Met deze keuzes hebben we een scherp beeld. Hier is de definitieve 'bonte lijst' die je direct aan je andere AI kunt geven. Deze is geschreven als een krachtige instructie om de spec in één keer volledig te updaten.

***

### 📝 Prompt voor de AI (Kopieer dit):

Update de Workout Tracker Design Spec (`2026-04-16-workout-tracker-design.md`) op basis van de volgende wijzigingen. Zorg dat de technische consistentie overal gewaarborgd blijft.

**1. 🔐 Authenticatie (Clerk + Convex)**
*   Verander "No auth" naar "Authentication via **Clerk**".
*   Voeg een `userId: string` toe aan alle relevante tabellen (`workoutSessions`, `exercises` (voor custom ones), `oneRepMaxes`, `routines`, `settings`).
*   Update de stack-tabel met Clerk.

**2. 🏗️ Datamodel & Architectuur Upgrades**
*   **`sets` table:** Vervang `isWarmup` door `setType: "warmup" | "working" | "drop" | "failure"`. 
*   **`workoutSessions` table:** Voeg `startTime: number`, `status: "active" | "completed" | "cancelled"` toe.
*   **`exercises` table:** Maak `equipment` een strikte union type. Voeg een `notes` veld toe. Specificeer dat `isDefault: true` oefeningen **Read-Only** zijn voor de gebruiker.

**3. 🧠 Business Logica & 1RM**
*   **1RM Logica:** Als `reps == 1`, is de `weight` de "actual" 1RM. Gebruik de Epley-formule alleen bij `reps > 1`.
*   **Query Rule:** Definieer dat de "Huidige 1RM" de hoogste `calculated` waarde is, OF de meest recente `manual` entry (manual overrijdt berekeningen).
*   **Delete Flows:** Voeg een sectie toe over verwijderen: Gebruikers kunnen sets, volledige sessies en custom exercises verwijderen. Bij het verwijderen van een sessie moeten de bijbehorende 1RM-records worden opgeschoond/herberekend.

**4. ✨ UX & New Features (Promoveer uit 'Out of Scope')**
*   **Mobile Experience:** Specificeer een "Card-based" layout voor de logging-view op mobiel (ipv een brede tabel).

**5. 🧹 Opschoning**
*   Voeg een sectie toe over **PWA & Offline Support** (essentieel voor in de gym).
*   Eis het gebruik van **Zod schemas** voor alle Convex-tabellen en TanStack Forms.

***

Succes met het updaten! Laat het me weten als ik daarna moet helpen met de daadwerkelijke implementatie.