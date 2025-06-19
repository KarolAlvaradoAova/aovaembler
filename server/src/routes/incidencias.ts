import { Router } from 'express';
import { loadIncidencias } from '../../database/csvLoader';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const incidencias = await loadIncidencias();
    res.json(incidencias);
  } catch (error) {
    console.error('❌ Error consultando incidencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
