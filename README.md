# CausalFunnel Analytics

A lightweight, full-stack web analytics platform designed to track and visualize user behavior, including page views and precise click coordinates. 

I built CausalFunnel to understand how user behavior tracking systems work under the hood. While integrating third-party tools like Google Analytics or Hotjar is easy, building a custom tracking snippet and ingestion pipeline from scratch provided a deep dive into DOM events, single-page application (SPA) routing challenges, and high-throughput data aggregation using MongoDB.

Viewed README.md:1-70
Listed directory Frontend
Listed directory Backend
Viewed .env:1-2
Viewed .env:1-3

Here are the setup instructions to get **CausalFunnel** running locally. 

This is a monorepo consisting of a Node.js + Express **Backend** and a React + Vite **Frontend**.

### Prerequisites
Before you begin, ensure you have the following installed on your system:
1. **[Node.js](https://nodejs.org/en/)** (v14 or higher recommended)
2. **[MongoDB](https://www.mongodb.com/try/download/community)** (must be running locally)

---

### 1. Database Setup
The backend requires a local instance of MongoDB.
Make sure your local MongoDB server is running. The backend will attempt to connect to:
`mongodb://127.0.0.1:27017/causalfunnel`

*Note: You don't need to manually create the database or collections; Mongoose will handle this upon connection.*

---

### 2. Backend Setup
Open a terminal and navigate to the backend directory:

```bash
cd C:\Users\surus\OneDrive\Desktop\CausalFunnel\Backend
```

**Install dependencies:**
```bash
npm install
```

**Verify Environment Variables:**
Check the [.env](file:///C:/Users/surus/OneDrive/Desktop/CausalFunnel/Backend/.env) file. It should already contain:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/causalfunnel
```

**Start the server:**
```bash
npm start 
# Or node server.js if there is no start script
```
You should see a message indicating the server is running on port 5000 and connected to MongoDB.

---

### 3. Frontend Setup
Open a **new** terminal window and navigate to the frontend directory:

```bash
cd C:\Users\surus\OneDrive\Desktop\CausalFunnel\Frontend
```

**Install dependencies:**
```bash
npm install
```

**Verify Environment Variables:**
Check the [.env](file:///C:/Users/surus/OneDrive/Desktop/CausalFunnel/Frontend/.env) file. It should already contain the correct API URL:
```env
VITE_API_URL=http://localhost:5000
```

**Start the Vite development server:**
```bash
npm run dev
```

The terminal will provide a local URL (usually `http://localhost:5173`). Open this URL in your browser to view the application!

## Architecture & Tech Stack

This is a monorepo consisting of:
- **Frontend (`/Frontend`)**: React + Vite application. It serves dual purposes:
  1. The **Playground**: A demo area where the `tracker.js` script actively records user interactions.
  2. The **Dashboard**: The admin interface displaying KPIs, User Journeys, and a custom HTML5 Canvas click Heatmap.
- **Backend (`/Backend`)**: Node.js + Express API. Responsible for receiving high-volume event payloads and aggregating data.
- **Database**: MongoDB (via Mongoose). Chosen for its flexible schema and powerful aggregation pipeline capabilities (`$facet`, `$group`).

## Design Decisions & Trade-offs

* **Vanilla Fetch over Axios**: The tracking script (`tracker.js`) must be as lightweight as possible to avoid slowing down the host application. I opted for the native `fetch` API instead of bundling Axios.
* **Denormalized MongoDB Schema**: Rather than creating separate collections for `Users`, `Sessions`, and `Events`, everything is flattened into a single `Events` collection. *Trade-off:* This consumes more disk space, but it drastically improves write speeds, which is critical for an analytics ingestion endpoint.
* **Canvas API for Heatmaps**: Instead of using heavy charting libraries (like D3 or Chart.js) for the heatmap, I manipulated the HTML5 `<canvas>` directly. By drawing radial gradients and dynamically recoloring the alpha channels based on pixel density, I achieved a "thermal" effect with zero external dependencies.
* **Custom Routing over React Router**: Since the application is simple (just two main views), I avoided React Router. Instead, I monkey-patched the native `window.history.pushState` to ensure the tracker correctly registers page views during SPA navigation.

## Challenges Faced

1. **SPA Page View Tracking**: React apps don't trigger full page reloads when navigating. I had to intercept the browser's History API to reliably fire `page_view` events.
2. **Offline Resilience**: If the user's internet drops, or the backend goes down, tracking data shouldn't be lost. I implemented a robust `localStorage` queuing system in the tracker with exponential backoff retries.

## Future Improvements

* **Event Batching**: Currently, every click triggers an HTTP request. I plan to implement batching (e.g., sending an array of 20 events every 5 seconds) to reduce network overhead.
* **Redis Caching**: The `/api/sessions` and `/api/stats` endpoints run heavy MongoDB aggregations. Caching these results in Redis would significantly speed up dashboard load times.
* **Rate Limiting**: Adding `express-rate-limit` to the ingestion endpoint to prevent abuse or DDOS attacks.

---

## Suggested Development History

If you're reviewing this repository, here is the chronological sequence of how the features were developed:

```text
1. Initial project setup (Vite frontend, Express backend)
2. Add MongoDB Event schema and DB connection
3. Implement core tracker.js script (page_view and click capture)
4. Add localStorage queueing and exponential backoff to tracker
5. Create sessions REST API with MongoDB aggregation pipelines
6. Build React dashboard layout and KPI stat cards
7. Implement paginated Sessions List table
8. Create chronological User Journey timeline component
9. Build custom HTML5 Canvas heatmap visualization
10. Refine UI styling and polish responsive design
11. Update documentation and deployment guide
```

---

