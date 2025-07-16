import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('crawler_data');
}

export async function getSiteStates(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('site_states');
}

export async function getUrlStates(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('url_states');
}

export async function getDailyStats(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('daily_stats');
}

export async function getPerformanceHistory(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('performance_history');
}

export async function getAuditLog(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('audit_log');
}

export async function getPageChanges(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('page_changes');
}

// Helper function to get all available sites
export async function getAllSites() {
  // ONLY USE site_states collection - the authoritative source for active sites
  const siteStates = await getSiteStates();
  const activeSites = await siteStates.find({}).toArray();
  
  // Get URL counts for each active site
  const urlStates = await getUrlStates();
  const sites = [];
  
  for (const siteState of activeSites) {
    // Convert database format (underscores) to dashboard format (hyphens)
    const dashboardSiteId = siteState.site_id.replace(/_/g, '-');
    
    // Get real page count for this site
    const totalPages = await urlStates.countDocuments({ site_id: siteState.site_id });
    
    sites.push({
      siteId: dashboardSiteId, // Dashboard format
      totalPages: totalPages, // Real count from url_states
      currentCycle: siteState.current_cycle || 1,
      isFirstCycle: siteState.is_first_cycle !== false,
      cycleStartTime: siteState.cycle_start_time,
      lastUpdated: siteState.updated_at
    });
  }
  
  return sites.sort((a, b) => b.totalPages - a.totalPages);
}

export default clientPromise; 