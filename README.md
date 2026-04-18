# SecureShop: Premium E-Commerce Checkout Architecture

This document outlines the architectural decisions, security strategies, performance optimizations, and edge-case handling implemented for the Frontend Assessment.

---

## 2. Architecture Write-Up (Data Flow + State Machine)

### Data Flow Architecture
The application employs a strictly unidirectional, dual-layer state management system using React's Native API (`useReducer` + Context API) to avoid external dependencies while maintaining enterprise patterns.

1. **Global Business State (`useReducer`):** Manages the Cart, Cart Hash, Security Tokens, and the exact Order State. This layer is automatically synced to `localStorage`.
2. **Local Ephemeral State (`useState`):** Manages UI-specific data like the Search Query, Filter dropdowns, and form inputs. This isolates high-frequency keystrokes from triggering global re-renders.
3. **Cross-Tab Synchronization:** A `storage` event listener watches for changes across tabs. It relies on a **Monotonically Increasing `cartVersion` Integer**. If Tab B detects a higher `cartVersion` in storage, it dispatches `SYNC_FROM_OTHER_TAB`, ensuring seamless multi-tab usage without entering a "state echo chamber" (infinite update loop).

### Explicit State Machine
Order orchestration is governed by a strict State Machine defined by a `VALID_TRANSITIONS` matrix. Illegal transitions (e.g., trying to transition from `ORDER_SHIPPED` back to `ORDER_SUBMITTED`) are actively blocked and logged as security events.

**Allowed Flow:**
`CART_READY` ➔ `CHECKOUT_VALIDATED` ➔ `ORDER_SUBMITTED` ➔ `ORDER_SUCCESS` ➔ `ORDER_SHIPPED` ➔ `ORDER_IN_TRANSIT` ➔ `ORDER_DELIVERED`.

*Failure Paths:*
If the mock API fails, the state shifts to `ORDER_INCONSISTENT` (allowing a secure retry back to validation) or `ORDER_FAILED` (allowing a rollback to cart).

---

## 3. Edge Case Matrix

| Edge Case Scenario | System Handling & Resolution |
| :--- | :--- |
| **Refresh during checkout** | `initApp` hook hydrates state from `localStorage`. It detects if the app was locked (`isCheckoutLocked`) and forces an unlock to prevent permanent deadlocks, safely returning the user to their review state. |
| **Double-click "Place Order"** | **Strict Lock:** Clicking "Pay" instantly sets `isCheckoutLocked = true`, disabling all buttons globally. **Tokens:** A one-time `CheckoutToken` is consumed. Subsequent rapid clicks fail validation instantly. |
| **Open in 2 tabs, change cart in Tab A** | Tab B listens to the `storage` event, compares the `cartVersion`, and auto-updates its UI instantly without triggering an infinite re-render loop. |
| **Payment open in Tab A, changing cart in Tab B** | The `sharedPaymentActive` flag syncs across tabs. If Tab A is on the payment screen, all "Add/Remove" buttons in Tab B are visually disabled and unclickable to prevent mid-payment cart mutations. |
| **API Delay / Timeout** | Simulated via a 2.5-second `await Promise`. The UI enters a `Validating...` state with a spinner, preventing any user interaction across all tabs until resolved. |
| **Partial/Invalid API Response** | Simulated via a 10% random failure rate (`Math.random() < 0.1`). Triggers `ORDER_INCONSISTENT` state, preserves the cart payload, and generates a fresh `CheckoutToken` for a safe retry. |

---

## 4. Performance Techniques & Evidence

To handle the simulated massive dataset (500+ items), the following performance techniques were implemented:

1. **2D/1D Virtualization (Windowing):** * *Implementation:* Built a custom `VirtualGrid` (for the responsive catalog) and `VirtualCartList` (for the cart). 
   * *Impact:* Instead of rendering 500 DOM nodes, the app calculates `scrollTop` and mathematically positions only the ~12 items currently visible in the viewport using absolute positioning, heavily reducing memory consumption.
2. **Memoization & Derived State:** * `useMemo` is used to chain the Filtering ➔ Searching ➔ Sorting pipelines, preventing recalculations on non-dependent renders.
   * `React.memo` wraps the `ProductCard` components so they do not unnecessarily re-render when the global cart state changes.
3. **Debouncing:** * A custom `useDebounce` hook delays search query execution by 300ms, preventing the filtering pipeline from blocking the main thread during rapid typing.

**Evidence (Profiling Notes):**
*(Insert screenshot of React DevTools Profiler here showing the flat render time of the Catalog View while scrolling the virtualized grid)*

---

## 5. Security & Tampering Strategy (Frontend-Only)

We implemented a "Zero-Trust" frontend architecture utilizing a layered defense mechanism:

* **Layer 1: Base64 Hashing (`cartHash`)**
  Whenever the cart updates via normal UI interaction, a hash of the IDs, quantities, and prices is generated. If a user alters the price in `localStorage` directly without updating the hash, the checkout immediately transitions to a blocked state.
* **Layer 2: Deep Catalog Verification (Source of Truth)**
  If a sophisticated user manipulates *both* the local storage array *and* recalculates the hash, the app performs a final Deep Verification. Before the API is called (or upon page hydration), the cart is iterated and checked against the pristine `massiveDataset` in memory. If prices mismatch, it throws a **Cart Conflict Overlay**, forcing the user to accept the corrected (real) prices or discard the cart.
* **Layer 3: Replay Attack Prevention**
  When entering the Payment view, a `CheckoutToken` is generated. It is consumed the millisecond the "Pay" button is clicked. Attempting to resubmit a hijacked payload fails because the token is nullified.

---

## 6. Notification Design & Rules

The notification system was built entirely from scratch using custom hooks and features:

* **Smart Deduplication (Aggregation):** If a user clicks "Add to Cart" 5 times rapidly, the `ADD_NOTIFICATION` reducer detects the identical message. Instead of spamming the UI with 5 toasts, it groups them, increments a badge `(5x) Added to cart...`, and bumps it to the top of the stack.
* **History & Queue:** Toasts auto-dismiss after 4 seconds, but all notifications are permanently stored in the `notificationHistory` array. Users can open a sliding side-panel to view all past events.
* **Filtering:** The Notification Panel includes categorized filters (All, Success, Warning, Error) mapped to visual design tokens (Emerald, Amber, Rose).
* **Accessibility (ARIA):** The toast container utilizes `aria-live="polite"` so screen readers appropriately announce when items are added to the cart or when security warnings trigger.

---

## 7. Originality Declaration

I, **[Insert Your Name]**, confirm that the architectural decisions, code implementation, and logic within this repository are my own original work, tailored specifically to meet the requirements of the Secure High-Performance Checkout Assessment.

*Date: [Insert Date]*

---

## 8. Console Debugging, Data Transmission Observability, and Structured Logging & Metrics

The application utilizes a robust observability strategy:

* **Structured Logging & Metrics:** Avoided scattered `console.log()` statements by routing telemetry through a singleton `DiagnosticLogger` class. Logs are tagged with structured levels (`INFO`, `WARN`, `ERROR`, `SEC_AUDIT`). 
* **PII Sanitization:** Before logging any state transitions or form submissions, the logger actively strips Personally Identifiable Information (e.g., swapping emails to `[REDACTED]`).
* **Console Debugging & Breakpoints:** During development, React DevTools and Chrome debugger breakpoints were heavily utilized within the `useReducer` to track the `cartVersion` diffs during cross-tab synchronization.
* **Data Transmission Observability:** Network payloads sent to the simulated `jsonplaceholder` API can be observed via the Network Tab, demonstrating the successful transmission of the generated `X-Checkout-Token`, cart payload, and derived totals.
* **Log Exporting:** A "📋 Copy Developer Logs" button in the footer extracts the structured JSON array of session logs to the clipboard, allowing developers to trace the exact State Machine flow leading up to an edge-case failure.


### 2. State Machine Diagram
Paste this right below the "Explicit State Machine" text:


### Explicit State Machine
Order orchestration is governed by a strict State Machine defined by a `VALID_TRANSITIONS` matrix... (keep your existing text here)

```mermaid
stateDiagram-v2
    [*] --> CART_READY
    
    CART_READY --> CHECKOUT_VALIDATED : Initiate Payment
    CHECKOUT_VALIDATED --> ORDER_SUBMITTED : Token Valid & Deep Match
    CHECKOUT_VALIDATED --> CART_READY : Tampering Detected (Block)
    
    ORDER_SUBMITTED --> ORDER_SUCCESS : API 200 OK
    ORDER_SUBMITTED --> ORDER_FAILED : API Reject
    ORDER_SUBMITTED --> ORDER_INCONSISTENT : Network Timeout
    
    %% Success Flow (Simulated Transit)
    ORDER_SUCCESS --> ORDER_SHIPPED : 3s Delay
    ORDER_SHIPPED --> ORDER_IN_TRANSIT : 3s Delay
    ORDER_IN_TRANSIT --> ORDER_DELIVERED : 3s Delay
    
    %% Clean Reset
    ORDER_DELIVERED --> CART_READY : Clear Cart
    ORDER_SUCCESS --> CART_READY : Clear Cart (User Override)
    
    %% Error Handling & Retries
    ORDER_FAILED --> CART_READY : Reset & Edit Cart
    ORDER_FAILED --> ORDER_SUBMITTED : Retry Payload
    
    ORDER_INCONSISTENT --> CHECKOUT_VALIDATED : Safe Retry (New Token)
    ORDER_INCONSISTENT --> CART_READY : Reset