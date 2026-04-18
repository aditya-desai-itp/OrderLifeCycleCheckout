# SecureShop: Premium E-Commerce Checkout Architecture

This document outlines the architectural decisions, security strategies, performance optimizations, and edge-case handling implemented for the Frontend Assessment.

---

## Architecture Write-Up (Data Flow + State Machine)

### Data Flow Architecture

<img width="1582" height="1027" alt="Ecommerce_Complete_Data_Flow" src="https://github.com/user-attachments/assets/9de97c5e-2552-4d69-9392-241e2a114078" />

*Figure 1: High-level unidirectional data flow across the application.*

The application employs a strictly unidirectional, dual-layer state management system using React's Native API (`useReducer` + Context API) to avoid external dependencies while maintaining good design patterns.

1. **Global Business State (`useReducer`):** Manages the Cart, Cart Hash, Security Tokens, and the exact Order State. This layer is automatically synced to `localStorage`.
2. **Local Ephemeral State (`useState`):** Manages UI-specific data like the Search Query, Filter dropdowns, and form inputs. This isolates high-frequency keystrokes from triggering global re-renders.

3. **Cross-Tab Synchronization:**

<img width="1399" height="832" alt="Ecommerce_UI_Tab_Flow" src="https://github.com/user-attachments/assets/9127bb2f-58d8-4694-94db-6949cde28d52" />

*Figure 2: Storage event listeners and state deduplication across independent browser tabs.*

A `storage` event listener watches for changes across tabs. It relies on a **Monotonically Increasing `cartVersion` Integer**. If Tab B detects a higher `cartVersion` in storage, it dispatches `SYNC_FROM_OTHER_TAB`, ensuring seamless multi-tab usage without entering a "state echo chamber" (infinite update loop).

---

### Explicit State Machine

<img width="1313" height="822" alt="Ecommerce_State_Diagram" src="https://github.com/user-attachments/assets/6bd9703e-0bef-4e33-ae3f-7eb1d0c8928d" />

*Figure 3: Global state machine mapping all valid application states and transitions.*

Order orchestration is governed by a strict State Machine defined by a `VALID_TRANSITIONS` matrix. Illegal transitions (e.g., trying to transition from `ORDER_SHIPPED` back to `ORDER_SUBMITTED`) are actively blocked and logged as security events.

<img width="1428" height="2461" alt="Ecommerce_Order_Payment_LifeCycle" src="https://github.com/user-attachments/assets/1a420741-6a8e-4f41-9893-c50501273eaf" />

*Figure 4: Secure orchestration pipeline from checkout validation to API submission.*

**Allowed Flow:**
`CART_READY` ➔ `CHECKOUT_VALIDATED` ➔ `ORDER_SUBMITTED` ➔ `ORDER_SUCCESS` ➔ `ORDER_SHIPPED` ➔ `ORDER_IN_TRANSIT` ➔ `ORDER_DELIVERED`.

*Failure Paths:*
If the mock API fails, the state shifts to `ORDER_INCONSISTENT` (allowing a secure retry back to validation) or `ORDER_FAILED` (allowing a rollback to cart).

---

## Edge Case Matrix

| Edge Case Scenario | System Handling & Resolution |
| :--- | :--- |
| **Refresh during checkout** | `initApp` hook hydrates state from `localStorage`. It detects if the app was locked (`isCheckoutLocked`) and forces an unlock to prevent permanent deadlocks, safely returning the user to their review state. The cart is also hydrated as it was before the checkout. |
| **Double-click "Place Order"** | **Strict Lock:** Clicking "Pay" instantly sets `isCheckoutLocked = true`, disabling all buttons globally. **Tokens:** A one-time `CheckoutToken` is consumed. Subsequent rapid clicks fail validation instantly. |
| **Open in 2 tabs, change cart in Tab A** | Tab B listens to the `storage` event, compares the `cartVersion`, and auto-updates its UI instantly without triggering an infinite re-render loop. |
| **Payment open in Tab A, changing cart in Tab B** | The `sharedPaymentActive` flag syncs across tabs. If Tab A is on the payment screen, all "Add/Remove" buttons in Tab B are visually disabled and unclickable to prevent mid-payment cart mutations. |
| **API Delay / Timeout** | Simulated via a 2.0-second `await Promise`. The UI enters a `Validating...` state with a spinner, preventing any user interaction across all tabs until resolved. |
| **Partial/Invalid API Response** | Simulated via a 10% random failure rate (`Math.random() < 0.1`). Triggers `ORDER_INCONSISTENT` state, preserves the cart payload, and generates a fresh `CheckoutToken` for a safe retry. |

---

## Performance Techniques & Evidence

To handle the simulated massive dataset (500+ items), the following performance techniques were implemented:

1. **2D/1D Virtualization (Windowing):** * *Implementation:* Built a custom `VirtualGrid` (for the responsive catalog) and `VirtualCartList` (for the cart). 
   * *Impact:* Instead of rendering 500 DOM nodes, the app calculates `scrollTop` and mathematically positions only the ~12 items currently visible in the viewport using absolute positioning, heavily reducing memory consumption.
2. **Memoization & Derived State:** * `useMemo` is used to chain the Filtering ➔ Searching ➔ Sorting pipelines, preventing recalculations on non-dependent renders.
3. **Debouncing:** * A custom `useDebounce` hook delays search query execution by 300ms, preventing the filtering pipeline from blocking the main thread during rapid typing.

**Evidence (Profiling Notes):**

<img width="1697" height="850" alt="Screenshot 2026-04-18 172237" src="https://github.com/user-attachments/assets/84f46c05-9d90-495e-a36c-b056185408e2" />


---

## Security & Tampering Strategy (Frontend-Only)

Implemented a "Zero-Trust" frontend architecture utilizing a layered defense mechanism:

* **Layer 1: Base64 Hashing (`cartHash`)**
  Whenever the cart updates via normal UI interaction, a hash of the IDs, quantities, and prices is generated. If a user alters the price in `localStorage` directly without updating the hash, the checkout immediately transitions to a blocked state.
* **Layer 2: Deep Catalog Verification (Source of Truth)**
  If a sophisticated user manipulates *both* the local storage array *and* recalculates the hash, the app performs a final Deep Verification. Before the API is called (or upon page hydration), the cart is iterated and checked against the pristine `massiveDataset` in memory. If prices mismatch, it throws a **Cart Conflict Overlay**, forcing the user to accept the corrected (real) prices or discard the cart.
* **Layer 3: Replay Attack Prevention**
  When entering the Payment view, a `CheckoutToken` is generated. It is consumed the millisecond the "Pay" button is clicked. Attempting to resubmit a hijacked payload fails because the token is nullified. The idempotency key is sent along with the checkout token so repeated payment requests for the same checkout attempt do not create duplicate charges.

---

## Notification Design & Rules

The notification system was built entirely from scratch using custom hooks and features:

* **Smart Deduplication (Aggregation):** If a user clicks "Add to Cart" 5 times rapidly, the `ADD_NOTIFICATION` reducer detects the identical message. Instead of spamming the UI with 5 toasts, it groups them, increments a badge `(5x) Added to cart...`, and bumps it to the top of the stack.
* **History & Queue:** Toasts auto-dismiss after 2 seconds, but all notifications are permanently stored in the `notificationHistory` array. Users can open a sliding side-panel to view all past events.
* **Filtering:** The Notification Panel includes categorized filters (All, Success, Warning, Error) mapped to visual design tokens.
* **Accessibility (ARIA):** The toast container utilizes `aria-live="polite"` so screen readers appropriately announce when items are added to the cart or when security warnings trigger.

---

## Originality Declaration

I, Aditya Desai, confirm that the architectural design, system logic, and integration of features within this repository are my original work. Generative AI tools were utilized as development assistants to optimize specific code patterns and assist in boilerplate implementation, while all final engineering decisions and security orchestrations were directed by me.

*Date: 17/04/2026*

---

## Console Debugging, Data Transmission Observability, and Structured Logging & Metrics

The application utilizes a robust observability strategy:

* **Structured Logging & Metrics:** Avoided scattered `console.log()` statements by routing telemetry through a singleton `DiagnosticLogger` class. Logs are tagged with structured levels (`INFO`, `WARN`, `ERROR`, `SEC_AUDIT`). 
* **PII Sanitization:** Before logging any state transitions or form submissions, the logger actively strips Personally Identifiable Information (e.g., swapping emails to `[REDACTED]`).
* **Console Debugging & Breakpoints:** During development, React DevTools and Chrome debugger breakpoints were heavily utilized within the `useReducer` to track the `cartVersion` diffs during cross-tab synchronization.
* **Data Transmission Observability:** Network payloads sent to the simulated `jsonplaceholder` API can be observed via the Network Tab, demonstrating the successful transmission of the generated `X-Checkout-Token`, cart payload, and derived totals.
* **Log Exporting:** A "Copy Developer Logs" button in the footer extracts the structured JSON array of session logs to the clipboard, allowing developers to trace the exact State Machine flow leading up to an edge-case failure.

## Video documenting the full application overview, explaining features and showcasing debugging of one key feature

[Video Link](https://intuitivetp-my.sharepoint.com/:v:/g/personal/aditya_desai_intuitive_ai/IQB6WBioUuDPT5PRXsliZ7qZAZ_NGBx4PxBTEAz-tBe9kso?e=gv6SAG)
