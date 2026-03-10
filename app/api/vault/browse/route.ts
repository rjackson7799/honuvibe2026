import { NextRequest, NextResponse } from 'next/server';
import { getVaultBrowse } from '@/lib/vault/queries';
import type { VaultBrowseFilters } from '@/lib/vault/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: VaultBrowseFilters = {};

  const search = searchParams.get('search');
  if (search) filters.search = search;

  const contentType = searchParams.get('contentType');
  if (contentType) filters.contentType = contentType as VaultBrowseFilters['contentType'];

  const difficulty = searchParams.get('difficulty');
  if (difficulty) filters.difficulty = difficulty as VaultBrowseFilters['difficulty'];

  const sort = searchParams.get('sort');
  if (sort) filters.sort = sort as VaultBrowseFilters['sort'];

  const accessTier = searchParams.get('accessTier');
  if (accessTier) filters.accessTier = accessTier as VaultBrowseFilters['accessTier'];

  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page, 10);

  const pageSize = searchParams.get('pageSize');
  if (pageSize) filters.pageSize = parseInt(pageSize, 10);

  const result = await getVaultBrowse(filters);
  return NextResponse.json(result);
}
