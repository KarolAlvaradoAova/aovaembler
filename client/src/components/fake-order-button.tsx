import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_CONFIG } from "@/config/api";

// Productos reales de la base de datos
const PRODUCTOS = [
  { id: 1, codigo: "0004203602 *3", nombre: "BALATAS FRENOS TRASEROS MERCEDES W205 X253 (TRW GDB2071)" },
  { id: 2, codigo: "0004600183 *1", nombre: "DEPOSITO LIQUIDO DIRECCION HIDRAULICA MERCEDES W163 W210 W211 W220 (FREY)" },
  { id: 3, codigo: "0001802609 *1", nombre: "FILTRO ACEITE MOTOR MERCEDES M111 M112 M113 M271 M272 M273 (FREY)" },
  { id: 4, codigo: "0004206700 *1", nombre: "BALATAS FRENOS DELANTEROS MERCEDES W205 AMG W213 X253 (FREY)" },
  { id: 5, codigo: "0000903751 *3", nombre: "FILTRO ENTRADA AIRE MOTOR SPRINTER W906 OM651 (MAHLE LX1845)" },
  { id: 6, codigo: "0004202902 *1", nombre: "BALATAS FRENOS DELANTEROS 129X71 MM MERCEDES W176 W246 (FREY)" },
  { id: 7, codigo: "0004212312 *1", nombre: "DISCO DE FRENOS DELANTEROS 360 X 36 MM MERCEDES W205 X253 (FREY)" },
  { id: 8, codigo: "0005426218", nombre: "SENSOR DE TEMPERATURA W203 TOPRAN" },
  { id: 9, codigo: "0009050242 *1", nombre: "SENSOR DE ESTACIONAMIENTO MERCEDES W204 FREY" },
  { id: 10, codigo: "0019931896 *1", nombre: "BANDA ACCESORIOS MOTOR MEDIDA 6PK 2398 MM MERCEDES W164 W204 W251 X204 M272 M273 (FREY)" },
];

// Direcciones predefinidas con coordenadas
const DIRECCIONES = [
  { id: 1, nombre: "Av. Reforma 123, CDMX", lat: 19.432700, lng: -99.133300 },
  { id: 2, nombre: "Calle 5, Metepec", lat: 19.290100, lng: -99.650100 },
  { id: 3, nombre: "Av. Lindavista 456, CDMX", lat: 19.510100, lng: -99.130100 },
  { id: 4, nombre: "Calle 10, Satelite", lat: 19.350100, lng: -99.200100 },
  { id: 5, nombre: "Av. Insurgentes Sur 1234, CDMX", lat: 19.385432, lng: -99.175678 },
];

// Sucursales disponibles
const SUCURSALES = [
  { id: 1, nombre: "satelite", lat: 19.500142, lng: -99.237374 },
  { id: 2, nombre: "metepec", lat: 19.263373, lng: -99.632921 },
  { id: 3, nombre: "lindavista", lat: 19.516238, lng: -99.143365 },
];

export function FakeOrderButton({ onPedidoCreado }: { onPedidoCreado?: () => void }) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      
      // Obtener el último ID de pedido
      const response = await fetch(API_CONFIG.ENDPOINTS.PEDIDOS);
      const pedidos = await response.json();
      const lastId = Math.max(...pedidos.map((p: any) => parseInt(p.id)), 0);
      const newId = (lastId + 1).toString();

      // Validar que se hayan seleccionado todos los campos
      if (!selectedProduct || !selectedAddress || !selectedSucursal) {
        toast({
          title: "Error",
          description: "Por favor selecciona todos los campos",
          variant: "destructive",
        });
        return;
      }

      // Obtener los datos completos de las selecciones
      const producto = PRODUCTOS.find(p => p.id.toString() === selectedProduct);
      const direccion = DIRECCIONES.find(d => d.id.toString() === selectedAddress);
      const sucursal = SUCURSALES.find(s => s.id.toString() === selectedSucursal);

      if (!producto || !direccion || !sucursal) {
        throw new Error("Datos inválidos");
      }

      // Crear el nuevo pedido (sin repartidor asignado)
      const newPedido = {
        id: newId,
        productos: `1x${producto.codigo}`,
        direccion: direccion.nombre,
        latitud: direccion.lat.toString(),
        longitud: direccion.lng.toString(),
        estado: "pendiente",
        repartidor_asignado: "", // Campo vacío como solicitado
        sucursal_asignada: sucursal.nombre,
        fecha_creacion: new Date().toISOString(),
        fecha_entrega: null,
        productos_detalle: JSON.stringify([{
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: 1
        }])
      };

      // Enviar el pedido al servidor
      const createResponse = await fetch(API_CONFIG.ENDPOINTS.PEDIDOS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPedido),
      });

      if (!createResponse.ok) {
        throw new Error("Error al crear el pedido");
      }

      toast({
        title: "Pedido creado",
        description: `Se ha creado el pedido #${newId} exitosamente (sin repartidor asignado)`,
      });
      if (onPedidoCreado) onPedidoCreado();

      // Cerrar el diálogo y limpiar los campos
      setIsOpen(false);
      setSelectedProduct("");
      setSelectedAddress("");
      setSelectedSucursal("");

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el pedido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border border-zinc-700">
        <DialogHeader>
          <DialogTitle>Crear Pedido de Prueba</DialogTitle>
          <DialogDescription>
            Completa los campos para crear un pedido de prueba sin repartidor asignado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="producto" className="text-white">Producto</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger id="producto" className="bg-zinc-900 text-white border-zinc-700 focus:ring-yellow-400 truncate overflow-hidden whitespace-nowrap">
                <SelectValue placeholder="Selecciona un producto" className="truncate overflow-hidden whitespace-nowrap" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                {PRODUCTOS.map((producto) => (
                  <SelectItem key={producto.id} value={producto.id.toString()} className="hover:bg-zinc-800">
                    {producto.codigo} - {producto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="direccion" className="text-white">Dirección de Entrega</Label>
            <Select value={selectedAddress} onValueChange={setSelectedAddress}>
              <SelectTrigger id="direccion" className="bg-zinc-900 text-white border-zinc-700 focus:ring-yellow-400 truncate overflow-hidden whitespace-nowrap">
                <SelectValue placeholder="Selecciona una dirección" className="truncate overflow-hidden whitespace-nowrap" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                {DIRECCIONES.map((direccion) => (
                  <SelectItem key={direccion.id} value={direccion.id.toString()} className="hover:bg-zinc-800">
                    {direccion.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sucursal" className="text-white">Sucursal</Label>
            <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
              <SelectTrigger id="sucursal" className="bg-zinc-900 text-white border-zinc-700 focus:ring-yellow-400 truncate overflow-hidden whitespace-nowrap">
                <SelectValue placeholder="Selecciona una sucursal" className="truncate overflow-hidden whitespace-nowrap" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white border-zinc-700">
                {SUCURSALES.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={sucursal.id.toString()} className="hover:bg-zinc-800">
                    {sucursal.nombre.charAt(0).toUpperCase() + sucursal.nombre.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-zinc-800 p-3 text-sm border border-zinc-700">
            <div className="flex items-center justify-between">
              <span>Repartidor asignado:</span>
              <span className="font-semibold text-yellow-400">
                Sin asignar
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              El pedido se creará sin repartidor asignado para usar en el optimizador de rutas
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleCreateOrder} 
            disabled={loading}
            className="bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                Creando...
              </>
            ) : (
              'Crear Pedido'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 