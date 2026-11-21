from fastapi import APIRouter

from app.routers import auth, categorias, clientes, facturas, inventario, productos, usuarios, ventas

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(clientes.router)
api_router.include_router(categorias.router)
api_router.include_router(productos.router)
api_router.include_router(inventario.router)
api_router.include_router(ventas.router)
api_router.include_router(facturas.router)
