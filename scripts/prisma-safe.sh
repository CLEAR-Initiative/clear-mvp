#!/bin/bash
# prisma-safe.sh — Safety wrapper that blocks dangerous Prisma commands.
# Route db:push through this script to prevent accidental schema pushes.

COMMAND="$1"
SUBCOMMAND="$2"

# Block prisma db push
if [[ "$COMMAND" == "db" && "$SUBCOMMAND" == "push" ]]; then
    echo "❌ BLOCKED: 'prisma db push' is not allowed!"
    echo ""
    echo "Use migrations instead:"
    echo "  npx prisma migrate dev --name <descriptive_name>"
    echo ""
    echo "This ensures schema changes are:"
    echo "  - Version controlled"
    echo "  - Reviewable by the team"
    echo "  - Safe for production deployments"
    echo "  - Rollback-capable"
    exit 1
fi

# Block prisma migrate reset (destructive)
if [[ "$COMMAND" == "migrate" && "$SUBCOMMAND" == "reset" ]]; then
    echo "❌ BLOCKED: 'prisma migrate reset' is destructive!"
    echo "This would drop and recreate your database."
    echo "If you really need this, run it manually outside of AI tooling."
    exit 1
fi

# Allow other prisma commands to pass through
echo "Running: npx prisma $*"
npx prisma "$@"
