describe('4g3n7 Frontend-Backend Integration', () => {
  it('connects to the backend API and shows health status', () => {
    cy.intercept('GET', '/api/health').as('health');
    cy.visit('/');
    cy.wait('@health').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
      expect(interception.response.body).to.have.property('status');
      expect(interception.response.body).to.have.property('version');
    });
    
    // Check that health status is displayed
    cy.contains('v').should('exist');
  });

  it('loads the trading interface and displays portfolio data', () => {
    cy.intercept('GET', '/api/agent/status').as('agentStatus');
    cy.visit('/trade');
    cy.wait('@agentStatus');
    
    // Wait for portfolio data to load
    cy.contains('Portfolio Overview', { timeout: 10000 }).should('exist');
    cy.contains('Total Value').should('exist');
    cy.contains('Assets').should('exist');
  });

  it('analyzes portfolio when button is clicked', () => {
    cy.intercept('POST', '/api/analyze').as('analyze');
    cy.visit('/trade');
    
    // Click analyze button
    cy.contains('button', 'Analyze Portfolio').click();
    cy.wait('@analyze').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
    });
    
    // Analysis results should appear
    cy.contains('Overview', { timeout: 15000 }).should('exist');
    cy.contains('Opportunities').should('exist');
  });

  it('connects to WebSocket for real-time updates', () => {
    cy.visit('/');
    
    // WebSocket status should indicate connected state
    cy.contains('WebSocket').should('exist');
    
    // Simulate WebSocket event (mock)
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('socketConnected'));
      cy.contains('WebSocket Connected').should('exist');
    });
  });
  
  it('shows attestation verification interface', () => {
    cy.intercept('GET', '/api/attestation').as('attestation');
    cy.visit('/');
    
    // Navigate to attestation tab
    cy.contains('Attestation Verification').click();
    cy.wait('@attestation');
    
    // Attestation interface should be visible
    cy.contains('Attestation Status').should('exist');
    cy.contains('Verify Attestation').should('exist');
  });
  
  it('shows recall memory logs', () => {
    cy.intercept('GET', '/api/recall*').as('recall');
    cy.visit('/');
    
    // Navigate to recall tab
    cy.contains('Recall Memory').click();
    cy.wait('@recall');
    
    // Memory interface should be visible
    cy.contains('Memory Logs').should('exist');
    cy.contains('Filter').should('exist');
  });
}); 