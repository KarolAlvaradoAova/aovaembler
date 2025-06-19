import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { fetchIncidencias } from '@/lib/utils';

const badgeColor = (estado: string) => {
  if (estado.toLowerCase().includes('pendiente')) return 'destructive';
  if (estado.toLowerCase().includes('resuelto')) return 'secondary';
  return 'default';
};

export function IncidentsTable() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidencias().then((data) => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow p-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-yellow-400 tracking-wide">
          Incidencias Activas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-yellow-400 font-bold">
                  Repartidor
                </TableHead>
                <TableHead className="text-yellow-400 font-bold">Tipo</TableHead>
                <TableHead className="text-yellow-400 font-bold">
                  Ubicación
                </TableHead>
                <TableHead className="text-yellow-400 font-bold">Estado</TableHead>
                <TableHead className="text-yellow-400 font-bold">Tiempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-4 text-muted">
                    Cargando incidencias...
                  </TableCell>
                </TableRow>
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-4 text-muted">
                    No hay incidencias reportadas
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className="bg-gray-900 border-b border-yellow-400 hover:bg-gray-800 transition"
                  >
                    <TableCell className="text-white font-semibold">
                      {incident.repartidor}
                    </TableCell>
                    <TableCell className="text-yellow-300 font-bold">
                      {incident.tipo}
                    </TableCell>
                    <TableCell className="text-white">{incident.ubicacion}</TableCell>
                    <TableCell>
                      <Badge
                        variant={badgeColor(incident.estado)}
                        className="rounded-full px-3 py-1 text-xs font-bold shadow-yellow"
                      >
                        {incident.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{incident.tiempo}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}