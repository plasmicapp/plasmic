"""Command-line interface."""
from __future__ import annotations

import click


@click.command()
@click.version_option()
def main() -> None:
    """Plasmic DB service."""
    pass


if __name__ == "__main__":
    main(prog_name="pybackend")  # pragma: no cover
