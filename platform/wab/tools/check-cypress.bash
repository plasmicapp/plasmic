#!/usr/bin/env bash

# Suuuper janky script. CRA depends on an older version of eslint, and I wanted to avoid that upgrade rabbit hole.
# Otherwise, eslint-plugin-ban works pretty well for this.

# We check that we're not inadvertently using: cy.window, cy.document, cy.focused, or Cypress.$.
# Actually, $(variable) is fine, but $('selector') is not, since it will be in the wrong document.
egrep -r '\.(window|document|focused)\b|\$\(' cypress/