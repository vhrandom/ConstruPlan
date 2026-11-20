import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

type MigratedActivity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors?: number[];
  successors?: number[];
  status?: string;
  type?: string;
  responsible?: string;
};

const dbPath = path.join(process.cwd(), 'construplan.db');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    duration INTEGER NOT NULL,
    predecessors TEXT DEFAULT '[]',
    successors TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'task',
    responsible TEXT,
    project_id INTEGER REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    photo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const activityColumns = db.prepare('PRAGMA table_info(activities)').all() as Array<{ name: string }>;
if (!activityColumns.some(column => column.name === 'project_id')) {
  db.exec('ALTER TABLE activities ADD COLUMN project_id INTEGER REFERENCES projects(id)');
}

const existingProject = db.prepare('SELECT id FROM projects ORDER BY id LIMIT 1').get() as { id: number } | undefined;
const initialProjectId = existingProject?.id ?? Number(
  db.prepare('INSERT INTO projects (name) VALUES (?)').run('Proyecto inicial').lastInsertRowid,
);
db.prepare('UPDATE activities SET project_id = ? WHERE project_id IS NULL').run(initialProjectId);

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
            const activities = JSON.parse(raw) as MigratedActivity[];

            const insert = db.prepare(`
        INSERT INTO activities (id, title, start, duration, predecessors, successors, status, type, responsible, project_id)
        VALUES (@id, @title, @start, @duration, @predecessors, @successors, @status, @type, @responsible, @project_id)
      `);

            const insertMany = db.transaction((activities: MigratedActivity[]) => {
                for (const activity of activities) {
                    insert.run({
                        id: activity.id,
                        title: activity.title,
                        start: activity.start,
                        duration: activity.duration,
                        predecessors: JSON.stringify(activity.predecessors || []),
                        successors: JSON.stringify(activity.successors || []),
                        status: activity.status || 'pending',
                        type: activity.type || 'task',
                        responsible: activity.responsible || '',
                        project_id: initialProjectId
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
