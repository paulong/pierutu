import { NextResponse } from 'next/server';

const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2022-06-28';
const PAGE_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function notionFetch(path: string, options: RequestInit) {
  const url = `${NOTION_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_API_TOKEN}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  return response;
}

async function resolvePageId(value: string) {
  if (PAGE_ID_REGEX.test(value)) {
    return value;
  }

  const response = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: value,
      filter: {
        property: 'object',
        value: 'page',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al buscar página en Notion: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.results?.find((item: any) => item.object === 'page');

  if (!result) {
    throw new Error(`No se encontró ninguna página de Notion con el nombre "${value}".`);
  }

  return result.id;
}

function buildCreatePagePayload({ title, text, properties, isDatabase }: { title?: string; text?: string; properties?: any; isDatabase?: boolean; }) {
  const pageTitle = title || text || 'Hello World';

  const payload: any = {
    parent: {},
  };

  if (isDatabase) {
    payload.properties = {
      Name: {
        title: [
          {
            text: {
              content: pageTitle,
            },
          },
        ],
      },
      ...(properties ?? {}),
    };
  } else {
    // For pages, properties are optional and depend on the page type
    if (properties) {
      payload.properties = properties;
    }
  }

  if (text) {
    payload.children = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: text,
              },
            },
          ],
        },
      },
    ];
  }

  return payload;
}

export async function createNotionPage(text: string, title?: string, properties?: any) {
  if (!NOTION_API_TOKEN) {
    throw new Error('Falta NOTION_API_TOKEN en el entorno');
  }

  const targetDatabaseId = NOTION_DATABASE_ID;
  const targetParentPageId = NOTION_PARENT_PAGE_ID;

  if (!targetDatabaseId && !targetParentPageId) {
    throw new Error('Se requiere databaseId o parentPageId para crear una página en Notion.');
  }

  let resolvedParentPageId: string | undefined;
  if (targetParentPageId) {
    resolvedParentPageId = await resolvePageId(targetParentPageId);
  }

  const payload = buildCreatePagePayload({ title, text, properties, isDatabase: !resolvedParentPageId });
  if (resolvedParentPageId) {
    payload.parent = { page_id: resolvedParentPageId };
  } else {
    payload.parent.database_id = targetDatabaseId;
  }

  const response = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Notion API: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}