'use server';

import { db } from '@/db';
import type {
  Environment,
  EnvironmentImage,
  EnvironmentImageKind,
  EnvironmentImageSource,
  ImageAsset,
} from '@/lib/types';
import { newPrefixedId } from '@/lib/server/ids';

interface EnvironmentRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  design_notes: string | null;
  environment_type: string | null;
  sort_order: number;
  prompt_positive: string | null;
  prompt_negative: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

interface EnvironmentImageRow {
  id: string;
  environment_id: string;
  kind: string;
  image_path: string;
  source: string;
  width: number;
  height: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapImageRow(row: EnvironmentImageRow): EnvironmentImage {
  const relPath = row.image_path;
  const asset: ImageAsset = {
    id: row.id,
    url: `/api/outputs/${relPath}`,
    width: row.width ?? 0,
    height: row.height ?? 0,
  };

  return {
    id: row.id,
    environmentId: row.environment_id,
    kind: (row.kind.toUpperCase() as EnvironmentImageKind) ?? 'OTHER',
    image: asset,
    source: (row.source as EnvironmentImageSource) ?? 'UPLOAD',
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapEnvironment(row: EnvironmentRow, images: EnvironmentImage[]): Environment {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    designNotes: row.design_notes ?? undefined,
    environmentType: row.environment_type ?? undefined,
    sortOrder: row.sort_order,
    promptPositive: row.prompt_positive ?? undefined,
    promptNegative: row.prompt_negative ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    images,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** List all environments for a project, including their reference images. */
export async function listEnvironments(projectId: string): Promise<Environment[]> {
  const environmentRows = db
    .prepare<[string], EnvironmentRow>(
      'SELECT * FROM environments WHERE project_id = ? ORDER BY sort_order, name',
    )
    .all(projectId) as EnvironmentRow[];

  if (!environmentRows.length) return [];

  const ids = environmentRows.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(',');
  const imageRows = db
    .prepare(
      `SELECT * FROM environment_images WHERE environment_id IN (${placeholders}) ORDER BY created_at`,
    )
    .all(...ids) as EnvironmentImageRow[];

  const byEnvironment: Record<string, EnvironmentImage[]> = {};
  for (const row of imageRows) {
    const img = mapImageRow(row);
    (byEnvironment[img.environmentId] ??= []).push(img);
  }

  return environmentRows.map((row) => mapEnvironment(row, byEnvironment[row.id] ?? []));
}

interface CreateEnvironmentInput {
  projectId: string;
  name: string;
  description?: string;
  designNotes?: string;
  environmentType?: string;
  sortOrder?: number;
  promptPositive?: string;
  promptNegative?: string;
  tags?: string[];
}

export async function createEnvironment(input: CreateEnvironmentInput): Promise<Environment> {
  const id = newPrefixedId('env');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO environments
      (id, project_id, name, description, design_notes, environment_type, sort_order,
       prompt_positive, prompt_negative, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.projectId,
    input.name,
    input.description ?? null,
    input.designNotes ?? null,
    input.environmentType ?? null,
    input.sortOrder ?? 0,
    input.promptPositive ?? null,
    input.promptNegative ?? null,
    input.tags ? JSON.stringify(input.tags) : null,
    now,
    now,
  );

  const row = db
    .prepare<[string], EnvironmentRow>('SELECT * FROM environments WHERE id = ?')
    .get(id);

  if (!row) throw new Error('Environment not found after create');
  return mapEnvironment(row, []);
}

interface UpdateEnvironmentInput {
  name?: string;
  description?: string;
  designNotes?: string;
  environmentType?: string;
  sortOrder?: number;
  promptPositive?: string;
  promptNegative?: string;
  tags?: string[];
}

export async function updateEnvironment(id: string, data: UpdateEnvironmentInput): Promise<void> {
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [new Date().toISOString()];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description ?? null);
  }
  if (data.designNotes !== undefined) {
    fields.push('design_notes = ?');
    values.push(data.designNotes ?? null);
  }
  if (data.environmentType !== undefined) {
    fields.push('environment_type = ?');
    values.push(data.environmentType ?? null);
  }
  if (data.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(data.sortOrder);
  }
  if (data.promptPositive !== undefined) {
    fields.push('prompt_positive = ?');
    values.push(data.promptPositive ?? null);
  }
  if (data.promptNegative !== undefined) {
    fields.push('prompt_negative = ?');
    values.push(data.promptNegative ?? null);
  }
  if (data.tags !== undefined) {
    fields.push('tags = ?');
    values.push(data.tags ? JSON.stringify(data.tags) : null);
  }

  values.push(id);

  db.prepare(`UPDATE environments SET ${fields.join(', ')} WHERE id = ?`).run(...(values as never[]));
}

export async function deleteEnvironment(id: string): Promise<void> {
  db.prepare('DELETE FROM environments WHERE id = ?').run(id);
}

interface AddEnvironmentImageInput {
  environmentId: string;
  kind: EnvironmentImageKind;
  imagePath: string; // relative path under outputs/, e.g. "refs/environments/..."
  source?: EnvironmentImageSource;
  width?: number;
  height?: number;
  notes?: string | null;
}

export async function addEnvironmentImage(input: AddEnvironmentImageInput): Promise<EnvironmentImage> {
  const id = newPrefixedId('envimg');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO environment_images
      (id, environment_id, kind, image_path, source, width, height, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.environmentId,
    input.kind,
    input.imagePath,
    input.source ?? 'UPLOAD',
    input.width ?? 0,
    input.height ?? 0,
    input.notes ?? null,
    now,
    now,
  );

  const row = db
    .prepare<[string], EnvironmentImageRow>('SELECT * FROM environment_images WHERE id = ?')
    .get(id);

  if (!row) throw new Error('Environment image not found after create');
  return mapImageRow(row);
}

export async function deleteEnvironmentImage(id: string): Promise<void> {
  db.prepare('DELETE FROM environment_images WHERE id = ?').run(id);
}