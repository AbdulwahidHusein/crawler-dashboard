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
  const siteStates = await getSiteStates();
  const sites = await siteStates.find({}, { 
    projection: { 
      site_id: 1, 
      total_pages_estimate: 1, 
      current_cycle: 1, 
      is_first_cycle: 1,
      cycle_start_time: 1,
      updated_at: 1 
    } 
  }).toArray();
  
  return sites.map(site => ({
    siteId: site.site_id,
    totalPages: site.total_pages_estimate || 0,
    currentCycle: site.current_cycle || 1,
    isFirstCycle: site.is_first_cycle || true,
    cycleStartTime: site.cycle_start_time,
    lastUpdated: site.updated_at
  }));
}

export default clientPromise; 