import AsistentePresupuestosClient from './AsistentePresupuestosClient';

export default function Page() {
  const pin = process.env.PIN_CORRECTO;

  if (!pin) {
    throw new Error('Falta la variable de entorno PIN_CORRECTO');
  }

  return <AsistentePresupuestosClient pinCorrecto={pin} />;
}

