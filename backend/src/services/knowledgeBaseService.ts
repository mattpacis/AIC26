import { prisma } from '../lib/db.js';
import {
  type AuthContext,
  assertStaff,
  assertStaffDepartmentAccess,
  AppError,
  staffDepartmentScope,
} from '../lib/permissions.js';

export type KnowledgeBaseFilters = {
  category?: string;
  department?: string;
  aiReferenced?: boolean;
  search?: string;
};

function formatUpdated(date: Date) {
  return `Updated ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function parseTags(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseContent(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function serializeArticleSummary(article: {
  slug: string;
  title: string;
  description: string;
  department: string;
  category: string;
  tags: string;
  viewCount: number;
  aiReferenced: boolean;
  readMinutes: number;
  updatedAt: Date;
}) {
  const tags = parseTags(article.tags);
  return {
    id: article.slug,
    slug: article.slug,
    title: article.title,
    description: article.description,
    department: article.department,
    category: article.category,
    tags,
    views: article.viewCount,
    readTime: `${article.readMinutes} min read`,
    updated: formatUpdated(article.updatedAt),
    aiReferenced: article.aiReferenced,
    filters: [
      'all',
      article.category,
      ...(article.aiReferenced ? ['ai-used'] : []),
    ],
  };
}

export async function listKnowledgeBaseArticles(
  ctx: AuthContext,
  filters: KnowledgeBaseFilters = {},
) {
  assertStaff(ctx);
  const scopedDepartment = staffDepartmentScope(ctx);

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: {
      schoolId: ctx.schoolId,
      ...(scopedDepartment ? { department: scopedDepartment } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  const search = filters.search?.trim().toLowerCase();

  return articles
    .map(serializeArticleSummary)
    .filter((article) => {
      if (filters.category && filters.category !== 'all' && article.category !== filters.category) {
        return false;
      }
      if (filters.department && article.department !== filters.department) {
        return false;
      }
      if (filters.aiReferenced && !article.aiReferenced) {
        return false;
      }
      if (search) {
        const haystack = [article.title, article.description, ...article.tags]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
}

export async function getKnowledgeBaseArticle(ctx: AuthContext, slug: string) {
  assertStaff(ctx);

  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { schoolId: ctx.schoolId, slug },
  });

  if (!article) {
    throw new AppError(404, 'Article not found');
  }

  if (ctx.role === 'STAFF' && ctx.department) {
    assertStaffDepartmentAccess(ctx, article.department);
  }

  await prisma.knowledgeBaseArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  });

  const content = parseContent(article.content);
  const tags = parseTags(article.tags);

  return {
    ...serializeArticleSummary({ ...article, viewCount: article.viewCount + 1 }),
    overview: Array.isArray(content.overview) ? content.overview : [],
    requirements: Array.isArray(content.requirements) ? content.requirements : [],
    steps: Array.isArray(content.steps) ? content.steps : [],
    note: typeof content.note === 'string' ? content.note : null,
    relatedIds: Array.isArray(content.relatedIds) ? content.relatedIds : [],
  };
}
