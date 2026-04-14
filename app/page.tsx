import AsistentePresupuestosClient from './AsistentePresupuestosClient';

export default function Page() {
  const pin = process.env.PIN_CORRECTO ?? '';

  return <AsistentePresupuestosClient pinCorrecto={pin} />;
}

