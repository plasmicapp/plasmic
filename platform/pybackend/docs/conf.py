"""Sphinx configuration."""
project = "Plasmic DB service"
author = "Plasmic Team"
copyright = "2023, Plasmic Team"
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx_click",
    "myst_parser",
]
autodoc_typehints = "description"
html_theme = "furo"
