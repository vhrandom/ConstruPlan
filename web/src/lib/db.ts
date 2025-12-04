import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'construplan.db');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    duration INTEGER NOT NULL,
    predecessors TEXT DEFAULT '[]',
    successors TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending'
  )
`);

// Migration logic: Import from activities.json if table is empty
const count = db.prepare('SELECT count(*) as count FROM activities').get() as { count: number };

if (count.count === 0) {
    const jsonPath = path.join(process.cwd(), 'data', 'activities.json');
    // Try alternate path if not found (in case cwd is 'web')
    const altJsonPath = path.join(process.cwd(), 'web', 'data', 'activities.json');

    let dataPath = '';
    if (fs.existsSync(jsonPath)) {
        dataPath = jsonPath;
    } else if (fs.existsSync(altJsonPath)) {
        dataPath = altJsonPath;
    }

    if (dataPath) {
        console.log(`Migrating data from ${dataPath}...`);
        try {
            const raw = fs.readFileSync(dataPath, 'utf-8');
            const activities = JSON.parse(raw);

            const insert = db.prepare(`
        INSERT INTO activities (id, title, start, duration, predecessors, successors, status)
        VALUES (@id, @title, @start, @duration, @predecessors, @successors, @status)
      `);

            const insertMany = db.transaction((activities) => {
                for (const activity of activities) {
                    insert.run({
                        id: activity.id,
                        title: activity.title,
                        start: activity.start,
                        duration: activity.duration,
                        predecessors: JSON.stringify(activity.predecessors || []),
                        successors: JSON.stringify(activity.successors || []),
                        status: activity.status || 'pending'
                    });
                }
            });

            insertMany(activities);
            console.log('Migration completed successfully.');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
}

export default db;
