import { NextResponse } from 'next/server';

const dispararScript = async (datos: any) => {
  const url = process.env.URL_SCRIPT_GOOGLE;
  if (!url) {
    throw new Error('Falta la variable de entorno URL_SCRIPT_GOOGLE');
  }

  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
};

export async function POST(request: Request) {
  const datos = await request.json();
  const response = await dispararScript(datos);
  const json = await response.json();

  return NextResponse.json(json, {
    status: response.status,
  });
}