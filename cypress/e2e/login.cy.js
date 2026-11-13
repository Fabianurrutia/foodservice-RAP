/**
 * Prueba de Frontend: proceso de login.
 * 1. Crea previamente un usuario real mediante la API (POST /api/auth/register).
 * 2. Inicia sesión desde la interfaz con ese usuario.
 * 3. Verifica que el nombre y el email ingresados se reflejan en la interfaz
 *    y que se muestra la lista de restaurantes.
 */
describe('Login de cliente en FoodService', () => {
  const usuario = {
    nombre: 'Diego Pizarro',
    email: `diego.pizarro+${Date.now()}@foodservice.cl`,
    password: 'Cliente2026'
  };

  before(() => {
    cy.request('POST', '/api/auth/register', usuario).its('status').should('eq', 201);
  });

  it('inicia sesión con el usuario creado y muestra sus datos en pantalla', () => {
    cy.visit('/');
    cy.get('[data-cy=tab-login]').click();
    cy.get('[data-cy=input-email]').type(usuario.email);
    cy.get('[data-cy=input-password]').type(usuario.password);
    cy.screenshot('01-formulario-login-completo');
    cy.get('[data-cy=btn-enviar]').click();

    // Los datos del usuario se reflejan correctamente en la interfaz
    cy.get('[data-cy=usuario-nombre]').should('have.text', usuario.nombre);
    cy.get('[data-cy=usuario-email]').should('have.text', usuario.email);
    cy.get('[data-cy=saludo]').should('contain', usuario.nombre);

    // Y se listan al menos 5 restaurantes de la cadena
    cy.get('[data-cy=restaurante]').should('have.length.at.least', 5);
    cy.screenshot('02-sesion-iniciada');
  });

  it('rechaza una contraseña incorrecta', () => {
    cy.visit('/');
    cy.get('[data-cy=input-email]').type(usuario.email);
    cy.get('[data-cy=input-password]').type('incorrecta');
    cy.get('[data-cy=btn-enviar]').click();
    cy.get('[data-cy=mensaje]').should('contain', 'incorrectos');
    cy.get('[data-cy=usuario-actual]').should('not.exist');
  });
});
