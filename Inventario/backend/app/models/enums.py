from enum import StrEnum


class RolUsuario(StrEnum):
    ADMIN = "ADMIN"
    CLIENTE = "CLIENTE"


class TipoDocumento(StrEnum):
    CC = "CC"  # Cédula de ciudadanía
    CE = "CE"  # Cédula de extranjería
    NIT = "NIT"
    PAS = "PAS"  # Pasaporte


class TipoMovimiento(StrEnum):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"
    AJUSTE = "AJUSTE"


class EstadoVenta(StrEnum):
    PENDIENTE = "PENDIENTE"
    PAGADA = "PAGADA"
    ANULADA = "ANULADA"
