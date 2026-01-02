"""
Individual migration files.

Each migration handles conversion between two specific schema versions.
Migrations are automatically discovered and registered using the
@MigrationRegistry.register decorator.

Example migration:

    from state.migrations import Migration, MigrationRegistry

    @MigrationRegistry.register
    class V1_0_to_V1_1(Migration):
        from_version = "1.0"
        to_version = "1.1"

        def forward(self, data):
            # Add new fields for v1.1
            data["new_feature"] = {"enabled": False}
            data["schema_version"] = "1.1"
            return data

        def backward(self, data):
            # Remove v1.1 fields, preserve in _unknown_fields
            if "new_feature" in data:
                unknown = data.setdefault("_unknown_fields", {})
                unknown["_preserved_new_feature"] = data.pop("new_feature")
            data["schema_version"] = "1.0"
            return data

        def can_migrate_backward(self, data):
            # Check if backward migration is safe
            return (True, "")
"""

# Import all migrations here to auto-register them
# Example: from .v1_0_to_v1_1 import V1_0_to_V1_1
