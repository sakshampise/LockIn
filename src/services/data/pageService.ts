import { supabase } from '@/lib/supabase/client';
import type { Page } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

type PageRow = Database['public']['Tables']['pages']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];

function mapPage(row: PageRow, tags: TagRow[]): Page {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    parentId: row.parent_id,
    icon: row.icon ?? undefined,
    tag: row.tag_id ? tags.find(tag => tag.id === row.tag_id)?.name : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPages(): Promise<Page[]> {
  const [{ data: pages, error: pagesError }, { data: tags, error: tagsError }] = await Promise.all([
    supabase.from('pages').select('*').order('sort_order', { ascending: true }).order('updated_at', { ascending: false }),
    supabase.from('tags').select('*'),
  ]);

  if (pagesError) throw pagesError;
  if (tagsError) throw tagsError;

  return pages.map(page => mapPage(page, tags));
}

export async function createPage(title: string, parentId: string | null = null): Promise<Page> {
  const { data, error } = await supabase
    .from('pages')
    .insert({ title, parent_id: parentId, content: '' })
    .select('*')
    .single();

  if (error) throw error;
  return mapPage(data, []);
}

export async function updatePage(page: Page): Promise<Page> {
  const payload: Database['public']['Tables']['pages']['Update'] = {
    title: page.title,
    content: page.content,
    parent_id: page.parentId,
    icon: page.icon ?? null,
  };

  const { data, error } = await supabase
    .from('pages')
    .update(payload)
    .eq('id', page.id)
    .select('*')
    .single();

  if (error) throw error;
  return { ...mapPage(data, []), tag: page.tag };
}

export async function deletePage(pageId: string): Promise<void> {
  const { error } = await supabase.from('pages').delete().eq('id', pageId);
  if (error) throw error;
}
