describe("create-data-source", function () {
  afterEach(() => {
    cy.contains(Cypress.env("dataSourceName")).rightclick();
    cy.get(".ant-dropdown-menu").contains("Delete").click({ force: true });
    cy.get(`[data-test-id="confirm"]`).click();
  });

  it("can create postgres data source", function () {
    cy.login();
    // Create Postgres data source
    cy.visit(`/projects/`, { log: false, timeout: 120000 });
    const dataSourceName = "Postgres Test";
    cy.contains("Plasmic's First Workspace").click();
    cy.contains("Integrations").click();
    cy.contains("New integration").click().wait(1000);
    cy.selectPropOption(`[data-test-id="data-source-picker"]`, "Postgres");
    cy.get(`[data-test-id="data-source-name"]`).click();
    cy.justType(dataSourceName);
    Cypress.env("dataSourceName", dataSourceName);
    cy.get(`[data-test-id="postgres-connection-string"]`).click();
    cy.get(`[data-test-id="prompt"]`).click();
    cy.justType("postgresql://wronguser:SEKRET@localhost:5432/postgres");
    cy.get(`[data-test-id="prompt-submit"]`).last().click();
    // Assert values
    cy.get(`[data-test-id="host"]`).should("have.value", "localhost");
    cy.get(`[data-test-id="port"]`).should("have.value", "5432");
    cy.get(`[data-test-id="name"]`).should("have.value", "postgres");
    cy.get(`[data-test-id="user"]`).should("have.value", "wronguser");

    // Test wrong connection
    cy.get(`[data-test-id="test-connection"]`).click();
    cy.get(
      ".ant-notification-notice-error:has(.ant-notification-notice-message:contains(Connection failed))"
    )
      .find(".ant-notification-notice-close")
      .click();

    // Fix configuration and test again
    cy.get(`[data-test-id="user"]`).click();
    cy.justType("{selectall}{backspace}cypress");

    cy.get(`[data-test-id="test-connection"]`).click();
    cy.get(
      ".ant-notification-notice-success:has(.ant-notification-notice-message:contains(Connection successful))"
    )
      .find(".ant-notification-notice-close")
      .click();

    cy.get(`[data-test-id="prompt-submit"]`).click();
  });

  it("can create HTTP data source", function () {
    cy.login();
    // Create HTTP data source
    cy.visit(`/projects/`, { log: false, timeout: 120000 });
    const dataSourceName = "HTTP Test";
    cy.contains("Plasmic's First Workspace").click();
    cy.contains("Integrations").click();
    cy.contains("New integration").click().wait(1000);
    cy.selectPropOption(`[data-test-id="data-source-picker"]`, "HTTP");
    cy.get(`[data-test-id="data-source-name"]`).click();
    cy.justType(dataSourceName);
    Cypress.env("dataSourceName", dataSourceName);
    cy.get(`[data-test-id="baseUrl"]`).click();
    cy.justType("https://jsonplaceholder.typicode.com/");

    cy.get(`[data-test-id="prompt-submit"]`).click();
  });
});
