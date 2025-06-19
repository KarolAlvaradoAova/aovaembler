import { Router } from 'express';
import { loadAlmacenistas } from '../../database/csvLoader';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const almacenistas = await loadAlmacenistas();
    res.json(almacenistas);
  } catch (error) {
    console.error('❌ Error consultando almacenistas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
