"""
Route package initializer.

We don’t import submodules here to avoid circular imports.
Routers should be imported in main.py like:

    from backend.routes import price, subscriptions
"""

__all__ = [
    "price",
    "subscriptions",
    "alerts",
    "crypto",
    "logs",
    "rescue",
    "users",
    "agent",
    "stripe_demo",
]
