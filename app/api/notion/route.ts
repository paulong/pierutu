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

export async function POST(request: Request) {
  if (!NOTION_API_TOKEN) {
    return NextResponse.json({ error: 'Falta NOTION_API_TOKEN en el entorno' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { databaseId, pageId, query, title, text, properties, parentPageId } = body ?? {};
    const targetDatabaseId = databaseId || NOTION_DATABASE_ID;
    const targetParentPageId = parentPageId || NOTION_PARENT_PAGE_ID;

    if (!pageId && !targetDatabaseId && !targetParentPageId && !title && !text) {
      return NextResponse.json(
        {
          error: 'Se requiere pageId, databaseId, parentPageId o texto para crear una página. Configura NOTION_DATABASE_ID o NOTION_PARENT_PAGE_ID o envía databaseId/parentPageId en el body.',
        },
        { status: 400 },
      );
    }

    let response;
    if (title || text) {
      if (!targetDatabaseId && !targetParentPageId) {
        return NextResponse.json(
          { error: 'Se requiere databaseId o parentPageId para crear una página en Notion.' },
          { status: 400 },
        );
      }

      const payload = buildCreatePagePayload({ title, text, properties, isDatabase: !targetParentPageId });
      if (targetParentPageId) {
        payload.parent = { page_id: targetParentPageId };
      } else {
        payload.parent.database_id = targetDatabaseId;
      }

      response = await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } else if (pageId) {
      response = await notionFetch(`/pages/${pageId}`, {
        method: 'GET',
      });
    } else {
      response = await notionFetch(`/databases/${targetDatabaseId}/query`, {
        method: 'POST',
        body: JSON.stringify(query ?? {}),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Error en Notion API', status: response.status, details: errorText },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
