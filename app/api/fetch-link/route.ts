import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL no válida' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Solo se permiten URLs HTTP/HTTPS' }, { status: 400 });
    }

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    const driveFolderUrl = process.env.GOOGLE_DRIVE_FOLDER_URL || 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE'; // Configura GOOGLE_DRIVE_FOLDER_URL en .env.local

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: parsedUrl.toString(),
      driveFolderUrl,
      message: response.ok
        ? `✅ Script ejecutado correctamente. Acceso directo a la carpeta: ${driveFolderUrl}`
        : `❌ Error al ejecutar el script: ${response.status} ${response.statusText}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
