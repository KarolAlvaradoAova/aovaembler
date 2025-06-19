import { Router } from 'express';
import { loadClientes } from '../../database/csvLoader';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const clientes = await loadClientes();
    res.json(clientes);
  } catch (error) {
    console.error('❌ Error consultando clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
