"""AtlasHabita · backend.

Paquete raíz del backend. Expone únicamente la versión pública; la lógica vive
organizada por dominios (``domain``, ``application``, ``infrastructure``,
``interfaces``) siguiendo la arquitectura screaming descrita en ADR 0002.
"""

from __future__ import annotations

__all__ = ["__version__"]
__version__ = "0.1.0"
