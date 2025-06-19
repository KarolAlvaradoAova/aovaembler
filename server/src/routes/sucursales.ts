import { Router } from 'express';
import { loadSucursales } from '../../database/csvLoader';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const sucursales = await loadSucursales();
    res.json(sucursales);
  } catch (error) {
    console.error('❌ Error consultando sucursales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
