import { NextResponse } from 'next/server';

const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2022-06-28';

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

  const payload = buildCreatePagePayload({ title, text, properties, isDatabase: !targetParentPageId });
  if (targetParentPageId) {
    payload.parent = { page_id: targetParentPageId };
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